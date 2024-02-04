import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';


let app = null;
let activeDragItem = null;
let dragTarget = null;
let isCableEditing = false;
let activeCable = null
let powerSource = null;
// This could be in a constants.js file or similar

const LEDS_PER_METER = 58;  // 1 meter = 200 pixels
let scale = 0.5;
let ledBarHeight = 15 * scale; // pixels
let meterToPixels = 200 * scale;  // 1 meter = 200 pixels



function init() {
    app.current.stage.eventMode = 'static';
    app.current.stage.hitArea = app.current.screen;
    app.current.stage.on('pointerup', onDragEnd);
    app.current.stage.on('pointerupoutside', onDragEnd);
    addPicture('grondplan.png');

}

function addPicture(imagePath) {
        // Path to your sprite image
    const spriteImagePath = imagePath;

    // Create a texture from an image path
    const texture = PIXI.Texture.from(spriteImagePath);

    // Create a sprite from the texture
    const sprite = new PIXI.Sprite(texture);

    // Set the sprite's anchor point to the center
    sprite.anchor.set(0.);

    // Position the sprite in the center of the screen
    sprite.x = 50;
    sprite.y = 50;

    sprite.scale.set(1.3)
    sprite.alpha = 0.5;

    const colorMatrix = new PIXI.filters.ColorMatrixFilter();
    colorMatrix.negative(false); // Passing false will not leave the luminance unchanged
    sprite.filters = [colorMatrix];

    // Add the sprite to the stage
    app.current.stage.addChild(sprite);
}

function toggleBrightness(app, brightness = 0.1) {
    // Assuming there's a global variable to keep track of the current brightness state
    if (!app.current.brightnessState || app.current.brightnessState === 1) {
        app.current.stage.children.forEach(child => {
            child.filters = [new PIXI.filters.ColorMatrixFilter()];
            child.filters[0].brightness(brightness, false);
        });
        app.current.brightnessState = brightness;
    } else {
        app.current.stage.children.forEach(child => {
            if (child.filters && child.filters.length > 0) {
                child.filters[0].brightness(1, false); // Reset brightness
            }
        });
        app.current.brightnessState = 1;
    }
}


function saveLayout() {
    let ledBarConfigs = [];
    for (const [, value] of Object.entries(inventoryManager.ledBars)) {
        ledBarConfigs.push(value.ledBar.save());
    }
    return ledBarConfigs;
}

function applyColors(colors) {
    globalLedManager.applyColors(colors);
}

function loadLayout(ledBarConfigs) {
    ledBarConfigs.forEach(ledBarData => {
        console.log(ledBarData);
        let ledbar = new LedBar(ledBarData.startPoint.coord, ledBarData.endPoint.coord, ledBarData.ledsPerMeter, ledBarData.id);
        inventoryManager.registerLedBar(ledbar);
    });
    // for each ledbar, we have to set some values
    ledBarConfigs.forEach(ledBarData => {
        const ledbar = inventoryManager.getLedBarById(ledBarData.id);
        ledbar.startPoint.id = ledBarData.startPoint.id;
        ledbar.endPoint.id = ledBarData.endPoint.id;
        ledbar.startPoint.isStartPoint = ledBarData.startPoint.isStartPoint;
        ledbar.endPoint.isStartPoint = ledBarData.endPoint.isStartPoint; 
        ledbar.startPoint.sibling = inventoryManager.getHandleById(ledBarData.startPoint.sibling);
        ledbar.endPoint.sibling = inventoryManager.getHandleById(ledBarData.endPoint.sibling);
        ledbar.ledsPerMeter = ledBarData.ledsPerMeter;
    });
    ledBarConfigs.forEach(ledBarData => {
        const ledbar = inventoryManager.getLedBarById(ledBarData.id);
        if (ledBarData.startPoint.linkedHandle !== null){
            ledbar.startPoint.linkedHandle = inventoryManager.getHandleById(ledBarData.startPoint.linkedHandle);
        }
        if (ledBarData.endPoint.linkedHandle !== null){
            ledbar.endPoint.linkedHandle = inventoryManager.getHandleById(ledBarData.endPoint.linkedHandle);
        }
    });

    ledBarConfigs.forEach(ledBarData => {
        const ledbar = inventoryManager.getLedBarById(ledBarData.id);
        if (ledBarData.startPoint.cable !== null && ledBarData.startPoint.cable.startHandle === ledBarData.startPoint.id){
            ledbar.startPoint.cable = new Cable(inventoryManager.getHandleById(ledBarData.startPoint.cable.startHandle), inventoryManager.getHandleById(ledBarData.startPoint.cable.endHandle));
            inventoryManager.registerCable(ledbar.startPoint.cable);
        }
        if (ledBarData.endPoint.cable !== null && ledBarData.endPoint.cable.startHandle === ledBarData.endPoint.id){
            ledbar.endPoint.cable = new Cable(inventoryManager.getHandleById(ledBarData.endPoint.cable.startHandle), inventoryManager.getHandleById(ledBarData.endPoint.cable.endHandle));
            inventoryManager.registerCable(ledbar.endPoint.cable);
        }
    });
}

// powersource is a small square with 1 unmovable handle. it will store the ledbarid of the connected ledbar (if any)
class PowerSource {
    constructor(coord) {
        this.coord = coord; // { x: number, y: number }
        this.id = -1;
        this.handle = new Handle(coord, -1, 0xFFFF00, -1, true); // { x: number, y: number }
        inventoryManager.registerHandle(this.handle);
    }

    updatePosition(newCoord) {
        this.coord = newCoord;
    }

    save() {
        return {
            coord: this.coord,
            id: this.id,
            handle: this.handle.save()
        };
    }   

}


class InventoryManager {
    constructor() {
        this.ledBars = {};
        this.handles = {};
        this.connections = [];
        this.cables = [];
        this.popups = [];
        this.nextId = 0;
    }

    // Register an LED and assign it a unique ID
    registerLedBar(ledBar) {
        this.ledBars[ledBar.id] = {'ledBar': ledBar, 'start': ledBar.startPoint, 'end': ledBar.endPoint, 'ledsPerMeter': ledBar.ledsPerMeter};
        this.handles[ledBar.startPoint.id] = ledBar.startPoint;
        this.handles[ledBar.endPoint.id] = ledBar.endPoint;
    }

    registerHandle(handle) {
        this.handles[handle.id] = handle;
    }

    registerPopup(popup) {
        const id = this.popups.length;
        this.popups.push(popup);
        return id;
    }

    registerCable(cable) {
        this.cables.push(cable);
    }

    deleteCable(cable) {
        this.cables = this.cables.filter(c => c.id !== cable.id);
    }

    deleteLedBar(ledBarId) {
        console.log(this.ledBars);
        this.ledBars[ledBarId].ledBar.ledBar.destroy();
        this.ledBars[ledBarId].ledBar.diffuser.destroy();
        this.ledBars[ledBarId].ledBar.startPoint.point.destroy();
        this.ledBars[ledBarId].ledBar.endPoint.point.destroy();

        delete this.handles[this.ledBars[ledBarId].start.id];
        delete this.handles[this.ledBars[ledBarId].end.id];
        delete this.ledBars[ledBarId];
    }

    getId() {
        return this.nextId++;
    }

    getLedBarById(id) {
        if(id in this.ledBars){
            return this.ledBars[id].ledBar;
        }

        return null;
    }

    getHandleById(id) {
        if(id in this.handles){
            return this.handles[id];
        }
    }

    // recursive function to return a list of all connected ledbars in order. we return a list of [ledbarid, isstartpoint]. a handle has a sibling on the other side of the ledbar. we can use this to traverse the ledbars
    addLinkedLedBars(startHandle) {
        if(startHandle && startHandle.linkedHandle !== null){
            let startLedBarId = startHandle.ledBarId;
            this.connections.push([startLedBarId, startHandle.isStartPoint]);
            let nextHandle = startHandle.sibling.linkedHandle;
            this.addLinkedLedBars(nextHandle)
        }
    }

    updateAllLedBars() {
        // for Each ledBar, we get the colors of the leds and set them to ledbar.ledColors
        for (const [, value] of Object.entries(this.ledBars)) {
            let colors = [];
            for (let i = 0; i < value.ledBar.numLeds; i++) {
                colors.push(value.ledBar.leds[i].color);
            }
            value.ledBar.ledColors = colors;
            value.ledBar.updatePosition();
        }

    }

    reassignIds() {
        if(powerSource.handle.linkedHandle !== null){
            this.connections = [];
            this.addLinkedLedBars(powerSource.handle.linkedHandle);
            globalLedManager.reassignIds();
        }
        if (powerSource.handle.linkedHandle === null){
            globalLedManager.resetAllLedIds();
            this.connections = [];
            globalLedManager.reassignIds();
        }
    }

    removePopups(id=-1) {
        if(id === -1){
            this.popups.forEach(popup => {
                // check if popup is still in the dom
                if (popup.parentNode){
                    document.body.removeChild(popup);
                }
            });
            this.popups = [];
        } else {
            this.popups.splice(id, 1);
        }
    }
}

class GlobalLedManager {
    constructor() {
        this.leds = [];
        this.orderedLeds = [];
    }

    // Register an LED and assign it a unique ID
    registerLed(led) {
        led.id = Math.random().toString(36).substring(7);
        this.leds.push(led);
    }

    // Update all LED IDs to be sequential across all bars
    resetAllLedIds() {
        this.leds.forEach(led => {
            led.id = Math.random().toString(36).substring(7);
        });
    }

    // Apply a given list of colors to ordered LEDs
    applyColors(colors) {
        colors.forEach((color, index) => {
            if (index < this.orderedLeds.length) {
                this.orderedLeds[index].setLedColor(color);
                // this.orderedLeds[index].color = color;
            }
        });
        // inventoryManager.updateAllLedBars();
    }
        

    // This method can be called when a new bar is created or when bars are reconnected
    reassignIds() {
        this.orderedLeds = [];
        for (let i = 0; i < inventoryManager.connections.length; i++) {
            const ledBarId = inventoryManager.connections[i][0];
            const isStartPoint = inventoryManager.connections[i][1];
            const ledBar = inventoryManager.getLedBarById(ledBarId);
            if (ledBar) {
                let ledBarLeds = [...ledBar.leds];
                if(!isStartPoint){
                    ledBarLeds.reverse();
                }
                for (let j = 0; j < ledBarLeds.length; j++) {
                    const led = ledBarLeds[j];
                    led.id = j;
                    this.orderedLeds.push(led);
                }
            }
        }
    }
}

const globalLedManager = new GlobalLedManager();
const inventoryManager = new InventoryManager();

// Function to generate random colors
function generateRandomColors(num) {
    let colors = [];
    for (let i = 0; i < num; i++) {
        // generate a random hex color, not in string format
        colors.push(Math.floor(Math.random()*16777215));
        
    }
    return colors;
}

class LedBar {
    constructor(start, end, ledsPerMeter, id) {
        if (id === undefined){
            id = inventoryManager.getId();
        }
        this.id = id;
        const handleId = Object.keys(inventoryManager.handles).length;
        this.startPoint = new Handle(start, this.id, 0x0000FF, handleId, true); // { x: number, y: number }
        this.endPoint = new Handle(end, this.id, 0xFF0000, handleId+1, false, this.startPoint); // { x: number, y: number }
        this.ledsPerMeter = ledsPerMeter;
        this.rotation = 0;
        inventoryManager.registerLedBar(this);
        this.drawRealisticLedBar(this.startPoint, this.endPoint, this.ledsPerMeter, this.id);
        this.numLeds = this.leds.length;
        this.lastClickTime = 0;
        
        app.current.stage.addChild(this.diffuser);
        app.current.stage.addChild(this.ledBar);
        
      // Additional properties like width or ID can be added here.
    }

    drawRealisticLedBar(startHandle, endHandle, ledsPerMeter, ledbarId, colors = null){
        this.ledBar = null;
        this.diffuser = null;
        this.leds = null;
        this.ledColors = null;
        let start = startHandle.coord;
        let end = endHandle.coord;
        let dx = end.x - start.x;
        let dy = end.y - start.y;
        this.distance = Math.sqrt(dx * dx + dy * dy);
        this.lengthInMeters = this.distance / meterToPixels;
        let numberOfLeds = Math.floor(this.lengthInMeters * ledsPerMeter);
        let colorList = colors;
        if (colorList === null || colorList.length !== numberOfLeds) {
            colorList = generateRandomColors(numberOfLeds);
        }
        const { ledBar, diffuser, leds, ledColors } = this.createLEDBar(colorList, start, end, ledbarId, ledsPerMeter);
        
        this.ledBar = ledBar;
        this.diffuser = diffuser;
        this.leds = leds;
        this.ledColors = ledColors;
        this.ledBar.interactive = true;
        this.ledBar.buttonMode = true;
        this.ledBar.cursor = 'pointer';
        this.ledBar
            .on('pointerdown', this.onDragStart.bind(this))
            .on('rightclick', this.onRightClick.bind(this))
            .on('pointerdown', this.onDoubleClick.bind(this));

        this.numLeds = this.leds.length;

        this.dragging = false;
        
        return { ledBar, diffuser, leds, ledColors };    
    };

    createLEDBar(colorList, startPoint, endPoint, ledbarId, leds_per_meter = LEDS_PER_METER) {
        let ledBar = new PIXI.Container();
        let dx = endPoint.x - startPoint.x;
        let dy = endPoint.y - startPoint.y;
        let angle = Math.atan2(dy, dx);
        // rotation is angle in degrees
        this.rotation = angle * 180 / Math.PI;
        let lengthInMeters = Math.sqrt(dx * dx + dy * dy) / meterToPixels;
        let numberOfLeds = Math.floor(lengthInMeters * leds_per_meter);
        let ledSize = lengthInMeters * meterToPixels / numberOfLeds;
    
        let diffuser = new PIXI.Graphics();
        diffuser.beginFill(0xffffff);
        diffuser.drawRect(0, 0, numberOfLeds * ledSize, ledBarHeight);
        diffuser.endFill();
    
        
    
        let leds = [];
        let ledColors = [];
    
        for (let i = 0; i < numberOfLeds; i++) {
            let color = colorList[i % colorList.length]; // Ensure color list wraps around if not enough colors
            let led = new Led(i * ledSize, color, ledbarId, ledSize);
            leds.push(led);
            ledColors.push(color);
            ledBar.addChild(led.displayObject);
        }
    
        ledBar.rotation = angle;
        ledBar.x = startPoint.x;
        ledBar.y = startPoint.y;
    
        // Create text to display above the LED bar
        let textContent = `Length: ${(lengthInMeters* 100).toFixed(0)}cm, LEDs: ${numberOfLeds}`;
        let textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 'white',
            align: 'center'
        });
        let text = new PIXI.Text(textContent, textStyle);
    
        text.x = this.distance / 2 - text.width / 2;
        text.y = -20;

        let blurFilter = new PIXI.BlurFilter();
        blurFilter.blur = 9*scale;
        ledBar.filters = [blurFilter];
        
        diffuser.x = startPoint.x;
        diffuser.y = startPoint.y;
        diffuser.rotation = angle;
        diffuser.addChild(text);
    
        return { ledBar, diffuser, leds, ledColors, text };
    }
    

    onDoubleClick(event) {
        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - this.lastClickTime;
        const doubleClickThreshold = 300; // Milliseconds; adjust as needed

        if (timeSinceLastClick < doubleClickThreshold) {
            // Perform the rotation
            this.rotate(90);
        }

        this.lastClickTime = currentTime;
    }

    rotate(degrees) {
        degrees = Number(degrees);
        const radians = degrees * (Math.PI / 180);

        // Update the rotation state
        this.rotation += degrees;
        // Normalize the rotation to the range [0, 360)
        // this.rotation = (this.rotation + 360) % 360;

        const midPoint = {
            x: (this.startPoint.coord.x + this.endPoint.coord.x) / 2,
            y: (this.startPoint.coord.y + this.endPoint.coord.y) / 2,
        };

        const rotatePoint = (point) => {
            const dx = point.x - midPoint.x;
            const dy = point.y - midPoint.y;
            return {
                x: midPoint.x + dx * Math.cos(radians) - dy * Math.sin(radians),
                y: midPoint.y + dx * Math.sin(radians) + dy * Math.cos(radians),
            };
        };

        const newStart = rotatePoint(this.startPoint.coord);
        const newEnd = rotatePoint(this.endPoint.coord);

        // Update the positions of the handles and the LED bar itself
        this.startPoint.updatePosition(newStart);
        this.endPoint.updatePosition(newEnd);
        this.updatePosition();
    }

    onDragStart(event) {
        // if leftclick 
        if (event.data.originalEvent.button === 0){
            this.alpha = 0.5;
            dragTarget = this.ledBar;
            activeDragItem = this;
            app.current.stage.on('pointermove', onDragMove);
            const initialMousePosition = event.data.getLocalPosition(dragTarget.parent);
            // Store the initial position of the ledBar relative to the mouse
            this.startPosition = {
                x: dragTarget.x - initialMousePosition.x + this.startPoint.coord.x + ((initialMousePosition.x - this.startPoint.coord.x)*2),
                y: dragTarget.y - initialMousePosition.y + this.startPoint.coord.y + ((initialMousePosition.y - this.startPoint.coord.y)*2),
            };
        }
    }

    onRightClick(event) {
        this.showEditPopup(event);
    }

    showEditPopup(event) {
        const popup = document.createElement('div');
        popup.style.position = 'absolute';
        
    
        // Calculate position
        const x = event.data.global.x;
        const y = event.data.global.y;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
    
        // Add form elements
        popup.innerHTML = `
            <style>
                .popup-content {
                    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
                    border-radius: 10px; /* Rounded corners */
                    padding: 20px; /* Padding inside the popup */
                    max-width: 150px; /* Limiting the maximum width */
                    font-size: 14px; /* Smaller font size */
                }
                .popup-content label,
                .popup-content input,
                .popup-content button {
                    display: block; /* Make each element take its own line */
                    width: 100%; /* Full width */
                    margin-bottom: 10px; /* Space between elements */
                }
                .popup-content input,
                .popup-content button {
                    padding: 5px; /* Padding inside inputs and button */
                }
                .popup-content button {
                    cursor: pointer; /* Change cursor on hover over the button */
                }
            </style>
            <div class="popup-content">
                <label>LPM: <input type="number" id="lpmInput" value="${this.ledsPerMeter}"></label>
                <label>Rotation: <input type="number" id="rotationInput" value="${this.rotation}"></label>
                <button id="submitBtn">Update</button>
                <button id="deleteBtn">Delete</button>
            </div>
        `;
    
        document.body.appendChild(popup);

        const popupId = inventoryManager.registerPopup(popup);
    
        document.getElementById('submitBtn').addEventListener('click', () => {
            const newLPM = document.getElementById('lpmInput').value;
            const newRotation = document.getElementById('rotationInput').value;
            this.updateLedBar(newLPM, newRotation, popupId);
            this.rotate(-this.rotation);
            this.rotate(newRotation);
            document.body.removeChild(popup);
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {   
            inventoryManager.deleteLedBar(this.id);
            document.body.removeChild(popup);
        });
    }

    updateLedBar(newLPM, newRotation, popupId){
        this.ledBar.destroy();
        this.diffuser.destroy();
        this.ledsPerMeter = newLPM;
        this.drawRealisticLedBar(this.startPoint, this.endPoint, this.ledsPerMeter, this.id);
        app.current.stage.addChild(this.diffuser);
        app.current.stage.addChild(this.ledBar);
        inventoryManager.removePopups(popupId);
    }


  
    // Method to update the position based on a moved endpoint.
    updatePosition(movedPoint = null, isStartPoint = true) {
        this.ledBar.destroy();
        this.diffuser.destroy();

        if (movedPoint !== null) {
            if (isStartPoint) {
                this.startPoint = movedPoint;
            } else {
                this.endPoint = movedPoint;
            }
        }
        this.drawRealisticLedBar(this.startPoint, this.endPoint, this.ledsPerMeter, this.id);
        app.current.stage.addChild(this.diffuser);
        app.current.stage.addChild(this.ledBar);

        this.dragging = false;
    }

    save() {
        return {
            id: this.id,
            startPoint: this.startPoint.save(),
            endPoint: this.endPoint.save(),
            ledsPerMeter: this.ledsPerMeter
        };
    }
}

class Led {
    constructor(x, color, ledbarId, ledSize = 20) {
        this.graphics = new PIXI.Graphics();
        this.graphics.beginFill(color);
        this.graphics.drawRect(0, 0, ledSize, ledBarHeight); // Draw the LED
        this.graphics.endFill();
        this.graphics.x = x;
        this.ledbarId = ledbarId;
        this.color = color;
        this.ledSize = ledSize;
        
        // Assign a unique ID from the global manager
        globalLedManager.registerLed(this);
    }

    get displayObject() {
        return this.graphics;
    }

    setLedColor(color) {
        // remove the old color, draw the new color
        this.color = color;
        this.graphics.clear();
        this.graphics.color = color;
        this.graphics.beginFill(color);
        this.graphics.drawRect(0, 0, this.ledSize, ledBarHeight); // Draw the LED
        this.graphics.endFill();
    }

    // Other methods related to LED can be added here, such as setColor, getId, etc.
}


class Handle {
    constructor(coord, ledBarId, color, handleId, isStartPoint = false, sibling = null) {
        this.coord = coord; // { x: number, y: number }
        this.ledBarId = ledBarId; // string
        this.id = handleId;
        this.point = this.createPoint(coord, color);
        this.isStartPoint = isStartPoint;
        this.linkedHandle = null;
        this.cable = null;
        app.current.stage.addChild(this.point);

        if (sibling !== null){
            this.sibling = sibling;
            sibling.sibling = this;
        }
    }

    save() {
        let cable = null;
        if (this.cable){
            cable = this.cable.save();
        }
        let linkedHandle = null;
        if (this.linkedHandle){
            linkedHandle = this.linkedHandle.id;
            if(linkedHandle === -1){
                linkedHandle = null;
            }
        }
        return {
            coord: this.coord,
            ledBarId: this.ledBarId,
            id: this.id,
            isStartPoint: this.isStartPoint,
            sibling: this.sibling.id,
            linkedHandle: linkedHandle,
            cable: cable
        };
    }

    updatePosition(newCoord) {
        this.coord.x = newCoord.x;
        this.coord.y = newCoord.y;
        // // Update the graphical representation of the handle, if any.
        
        this.point.x = newCoord.x;
        this.point.y = newCoord.y;
        if (this.cable !== null) {
            this.cable.updateSpline();
        }
        
    }

    linkHandle(handle) {
        this.linkedHandle = handle;
    }

    createPoint(coord, color){
        const point = new PIXI.Graphics();
        point.beginFill(color); // Nice blue color
        point.drawCircle(0, 0, 5); // Draw a small circle
        point.endFill();
        
        point.x = coord.x;
        point.y = coord.y;
        point.eventMode ='static';
        point.buttonMode = true;
        point.cursor = 'pointer';
        point
            .on('pointerdown', this.onDragStart.bind(this))
            .on('pointerup', this.onDragEnd.bind(this))
            .on('pointerupoutside', this.onDragEnd.bind(this));
    
        return point;
    }

    onDragStart(event) {
        if (isCableEditing) {
            const newPosition = event.data.getLocalPosition(app.current.stage);
            // Redraw the spline from the handle to the current mouse position
            this.cable = new Cable(this, { coord: newPosition });
            activeCable = this.cable;
        }
        else {
            this.alpha = 0.5;
            dragTarget = this.point;   
            this.initialDragPosition = this.coord;
            this.isDragging = true;
        }
        activeDragItem = this;
        app.current.stage.on('pointermove', onDragMove);
    }

    onDragEnd(event) {
        if (isCableEditing) {
            if (this.cable) {
                if (activeCable){
                    activeCable.finalizeSpline(null);
                    this.cable = null;
                }
            } else if (activeCable){
                activeCable.finalizeSpline(inventoryManager.handles[this.id]);
            }
        }
        else {
            this.alpha = 1;
            dragTarget = null;
            activeDragItem = null;
            this.isDragging = false;
            this.initialDragPosition = null;
        }
        app.current.stage.off('pointermove', onDragMove);
    }

}

class Cable {
    constructor(startHandle, endHandle) {
        this.startHandle = startHandle;
        this.endHandle = endHandle;
        this.currentAlpha = 1;
        this.id = Math.random().toString(36).substr(2, 9); // Generate a random ID
        this.spline = null;
        this.spline = this.drawSpline(startHandle.coord, endHandle.coord);
        this.spline.interactive = true;
        this.spline.eventMode ='static';
        this.spline.buttonMode = true;
        this.spline.on('pointerup', this.onArrowClick.bind(this));
        this.spline.cursor = 'pointer';
        
        if (endHandle instanceof Handle){
            endHandle.cable = this;
        }
    }

    save() {
        return {
            startHandle: this.startHandle.id,
            endHandle: this.endHandle.id,
            id: this.id
        };
    }


    drawArrow(start, end, cp1, cp2) {
        // Calculate midpoint for the arrow
        const t = 0.5; // Midpoint of the curve
        const mt = 1 - t;
        const x = mt * mt * mt * start.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * end.x;
        const y = mt * mt * mt * start.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * end.y;
    
        // Arrow properties
        const arrowLength = 10;
    
        // Calculate the angle of the line
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
        // Draw the arrow
        this.spline.beginFill(0xffffff);
        this.spline.moveTo(x, y);
        this.spline.lineTo(x - arrowLength * Math.cos(angle - Math.PI / 6), y - arrowLength * Math.sin(angle - Math.PI / 6));
        this.spline.lineTo(x - arrowLength * Math.cos(angle + Math.PI / 6), y - arrowLength * Math.sin(angle + Math.PI / 6));
        this.spline.lineTo(x, y);
        this.spline.endFill();
    }

    calculateControlPoints(start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
    
        // Adjust these values to change the curvature and loop size
        const curveDepth = 50;
        const loopTrigger = 100;
        const loopRadius = 170;
    
        if (distance < loopTrigger) {
            // Points are close, make a loop
            return {
                cp1: { x: start.x - loopRadius, y: start.y - loopRadius/2 },
                cp2: { x: end.x + loopRadius, y: end.y - loopRadius/2 },
            };
        } else {
            // Points are far enough apart, make a regular curve
            return {
                cp1: { x: start.x + dx / 3, y: start.y + (end.x > start.x ? curveDepth : -curveDepth) },
                cp2: { x: end.x - dx / 3, y: end.y - (end.x > start.x ? curveDepth : -curveDepth) },
            };
        }
    }

    drawSpline(start, end) {
        if (this.spline && this.spline.geometry) {
            this.spline.destroy();
        }
        this.spline = new PIXI.Graphics();
        this.spline.lineStyle(2, 0xffffff, .5);
    
        const { cp1, cp2 } = this.calculateControlPoints(start, end);
    
        this.spline.moveTo(start.x, start.y);
        this.spline.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
    
        app.current.stage.addChild(this.spline);
        this.drawArrow(start, end, cp1, cp2);
        this.spline.interactive = true;
        this.spline.eventMode ='static';
        this.spline.buttonMode = true;
        this.spline.on('pointerup', this.onArrowClick.bind(this));
        this.spline.cursor = 'pointer';
        this.spline.alpha = this.currentAlpha;
        return this.spline;
    }

    updateSpline() {
        if (this.spline && this.spline.geometry) {
            this.spline.destroy();
        }
        this.drawSpline(this.startHandle.coord, this.endHandle.coord);
        app.current.stage.addChild(this.spline);
    }

    finalizeSpline(handle) {
        //check if handle is not null and is not startHandle
        if (handle !== null &&
            handle !== this.startHandle && //check if target handle is not the startHandle
            handle.ledBarId !== this.startHandle.ledBarId && //check if handle is not on the same ledBar
            this.startHandle.linkedHandle === null && //check if startHandle is not already linked
            handle.linkedHandle === null //check if target handle is not already linked
            ){
            this.drawSpline(this.startHandle.coord, handle.coord);
            this.endHandle = handle;
            this.endHandle.linkHandle(this.startHandle);
            this.startHandle.linkHandle(this.endHandle);
            this.startHandle.cable = this;
            this.endHandle.cable = this;
            inventoryManager.registerCable(this);
            app.current.stage.addChild(this.spline);
        }
        else {
            if (this.spline && this.spline.geometry) {
                this.spline.destroy();
            }
            this.startHandle.cable = null;
        }
        activeCable = null;
    }

    onArrowClick() {
        // Remove the cable's graphical representation from the stage
        if (this.spline && this.spline.geometry) {
            this.spline.destroy();
        }
    
        // Update the handles to remove references to this cable
        if (this.startHandle instanceof Handle) {
            this.startHandle.linkedHandle = null;
            this.startHandle.cable = null;
        }
        if (this.endHandle instanceof Handle) {
            this.endHandle.linkedHandle = null;
            this.endHandle.cable = null;
        }

        inventoryManager.deleteCable(this);
        inventoryManager.reassignIds();    
        
    }


}

function onDragEnd()
{
    if (activeDragItem === null){
        inventoryManager.removePopups();
    }
    if (dragTarget)
    {
        app.current.stage.off('pointermove', onDragMove);
        dragTarget.alpha = 1;
        dragTarget = null;
        activeDragItem = null;
    }
    
}


function onDragMove(event) {
    // check if dragtarget is a handle or a ledbar
    if (activeDragItem instanceof Handle) {
        if (isCableEditing) {
            // Redraw the spline from the handle to the current mouse position
            const newPosition = event.data.getLocalPosition(app.current.stage);
            activeDragItem.cable.drawSpline(activeDragItem.coord, newPosition);    
        }
        else {
            if (activeDragItem instanceof Handle && activeDragItem.isDragging) {
                const newPosition = app.current.stage.toLocal(event.global, null, dragTarget.position);
        
                // Check if the Shift key is down
                if (event.data.originalEvent.shiftKey) {
                    const initialPosition = activeDragItem.initialDragPosition;
                    const dx = Math.abs(newPosition.x - initialPosition.x);
                    const dy = Math.abs(newPosition.y - initialPosition.y);
        
                    // Constrain to the X-axis
                    if (dx > dy) {
                        newPosition.y = initialPosition.y;
                    }
                    // Constrain to the Y-axis
                    else {
                        newPosition.x = initialPosition.x;
                    }
                }
            
                // activeDragItem.coord = dragTarget.position;
                activeDragItem.updatePosition(newPosition);
                const linkedLedBarId = activeDragItem.ledBarId;
                const linkedLedBar = inventoryManager.getLedBarById(linkedLedBarId);
                if (linkedLedBar) {
                    linkedLedBar.updatePosition(activeDragItem, activeDragItem === linkedLedBar.startPoint);
                }
            }
        }
    }
    //else if (activeDragItem instanceof LedBar) do the same but move both handles 
    else if (activeDragItem instanceof LedBar){
        const ledbar = activeDragItem;
        const newPosition = app.current.stage.toLocal(event.global, null, ledbar.position);
        const dx = newPosition.x - ledbar.startPosition.x;
        const dy = newPosition.y - ledbar.startPosition.y;

        // Update the positions of the handles and redraw the bar.
        ledbar.startPoint.updatePosition({ x: ledbar.startPoint.coord.x + dx, y: ledbar.startPoint.coord.y + dy });
        ledbar.endPoint.updatePosition({ x: ledbar.endPoint.coord.x + dx, y: ledbar.endPoint.coord.y + dy });
        ledbar.updatePosition(); // Redraw the bar with updated handles.

        // Update the startPosition for the next move.
        ledbar.startPosition = newPosition;
        
    }

}

const PixiCanvas = ({ ledBarConfigs, isCableEditingMode, isLightsOn }) => {
    const pixiContainer = useRef(null);
    app = useRef(null);
    useEffect(() => {
        // Safeguard for server-side rendering
        if (typeof window !== 'undefined') {
            app.current = new PIXI.Application({
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: 0x333333,
                antialias: true, 
                resolution: window.devicePixelRatio || 1,
            });
            pixiContainer.current.appendChild(app.current.view);
            init();

            powerSource = new PowerSource({ x: 10, y: 10 });

            // Handle window resize
            window.addEventListener('resize', () => {
                app.current.renderer.resize(window.innerWidth, window.innerHeight);
            });

            return () => {
                app.current.destroy(true, true);
                app.current = null;
            };
        }
    }, []); // Empty dependency array ensures this effect runs only once

    useEffect(() => {
        // Effect to handle drawing new LedBars when ledBars state changes
        let ledBar = ledBarConfigs.pop();
        if (ledBar){new LedBar(ledBar.start, ledBar.end, ledBar.ledsPerMeter);};

    }, [ledBarConfigs]);

    useEffect(() => {
        isCableEditing = isCableEditingMode;
        if(isCableEditingMode){
            inventoryManager.cables.forEach(cable => {
                cable.spline.alpha = 1;
                cable.currentAlpha = 1;
            });
        } else {
            inventoryManager.cables.forEach(cable => {
                cable.spline.alpha = 0.05;
                cable.currentAlpha = 0.05;
            });
        }
        

    }, [isCableEditingMode]);

    useEffect(() => {
        if (powerSource.handle.linkedHandle !== null){
            inventoryManager.reassignIds();
        }
        if (isLightsOn){
            app.current.renderer.backgroundColor = 0x050505;
            // go over each value of the handles. this is an object in inventoryManager.handles

            for (const [, value] of Object.entries(inventoryManager.handles)) {
                value.point.alpha = 0.1;
            }
            for (const [, value] of Object.entries(inventoryManager.ledBars)) {
                value.ledBar.diffuser.children[0].alpha = 0;
            }

        } else {
            app.current.renderer.backgroundColor = 0x333333;
            for (const [, value] of Object.entries(inventoryManager.handles)) {
                value.point.alpha = 1;
            }
            for (const [, value] of Object.entries(inventoryManager.ledBars)) {
                value.ledBar.diffuser.children[0].alpha = 1;
            }
            
        }
        
    }, [isLightsOn]);

    return (
        <div ref={pixiContainer} />
    );
};

export default PixiCanvas;
export { saveLayout , loadLayout, applyColors, meterToPixels};
