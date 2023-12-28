import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

let app = null;
let activeDragItem = null;
let dragTarget = null;
let isCableEditing = false;
let activeCable = null
let powerSource = null;


function init() {
    app.current.stage.eventMode = 'static';
    app.current.stage.hitArea = app.current.screen;
    app.current.stage.on('pointerup', onDragEnd);
    app.current.stage.on('pointerupoutside', onDragEnd);
    
}

// powersource is a small square with 1 unmovable handle. it will store the ledbarid of the connected ledbar (if any)
class PowerSource {
    constructor(coord) {
        this.coord = coord; // { x: number, y: number }
        this.id = 0;
        this.handle = new Handle(coord, -1, 0xFFFF00, 0, true); // { x: number, y: number }
    }

    updatePosition(newCoord) {
        this.coord = newCoord;
    }

}


class InventoryManager {
    constructor() {
        this.ledBars = {};
        this.handles = {};
        this.connections = [];
        this.nextId = 0;
    }

    // Register an LED and assign it a unique ID
    registerLedBar(ledBar) {
        this.ledBars[ledBar.id] = {'ledBar': ledBar, 'start': ledBar.startPoint, 'end': ledBar.endPoint};
        this.handles[ledBar.startPoint.id] = ledBar.startPoint;
        this.handles[ledBar.endPoint.id] = ledBar.endPoint;
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
        for (const [key, value] of Object.entries(this.ledBars)) {
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
        }
    }
}

class GlobalLedManager {
    constructor() {
        this.leds = [];
        this.ordenedLeds = [];
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
            if (index < this.ordenedLeds.length)
                this.ordenedLeds[index].setLedColor(color);
        });
        
        inventoryManager.updateAllLedBars();
    }

    applyColorsToLedBar(ledBar, colors) {
        const ledBarLeds = ledBar.leds;
        ledBarLeds.forEach((led, index) => {
            led.graphics.tint = colors[index];
        });
    }
        

    // This method can be called when a new bar is created or when bars are reconnected
    reassignIds() {
        this.ordenedLeds = [];
        console.log(inventoryManager.connections);
        for (let i = 0; i < inventoryManager.connections.length; i++) {
            const ledBarId = inventoryManager.connections[i][0];
            const isStartPoint = inventoryManager.connections[i][1];
            const ledBar = inventoryManager.getLedBarById(ledBarId);
            if (ledBar) {
                let ledBarLeds = [...ledBar.leds];
                console.log(ledBarLeds);
                if(!isStartPoint){
                    console.log('reversing');
                    ledBarLeds.reverse();
                    
                }
                console.log(ledBarLeds);
                for (let j = 0; j < ledBarLeds.length; j++) {
                    const led = ledBarLeds[j];
                    led.id = j;
                    this.ordenedLeds.push(led);
                }
            }
        }
        console.log(this.ordenedLeds);
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
    constructor(start, end) {
        this.id = inventoryManager.getId();
        const handleId = Object.keys(inventoryManager.handles).length;
        this.startPoint = new Handle(start, this.id, 0x0000FF, handleId, true); // { x: number, y: number }
        this.endPoint = new Handle(end, this.id, 0xFF0000, handleId+1, false, this.startPoint); // { x: number, y: number }
        inventoryManager.registerLedBar(this);
        this.ledSize = 20;
        const ledBarComponents = drawRealisticLedBar(this.startPoint, this.endPoint, this.id, this.ledSize);
        this.ledBar = ledBarComponents.ledBar;
        this.mask = ledBarComponents.mask;
        this.leds = ledBarComponents.leds;
        this.ledColors = ledBarComponents.ledColors;
        this.numLeds = this.leds.length;
        
        app.current.stage.addChild(this.mask);
        app.current.stage.addChild(this.ledBar);

        this.ledBar.interactive = true;
        this.ledBar.buttonMode = true;
        this.ledBar
            .on('pointerdown', this.onDragStart.bind(this))

        this.dragging = false;
        
      // Additional properties like width or ID can be added here.
    }

    onDragStart(event) {
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
  
    // Method to update the position based on a moved endpoint.
    updatePosition(movedPoint = null, isStartPoint = true) {
        this.ledBar.destroy();
        this.mask.destroy();

        if (movedPoint !== null) {
            if (isStartPoint) {
                this.startPoint = movedPoint;
            } else {
                this.endPoint = movedPoint;
            }
        }
        const ledBarComponents = drawRealisticLedBar(this.startPoint, this.endPoint, this.id, this.ledColors, this.ledSize);
        this.ledBar = ledBarComponents.ledBar;
        this.mask = ledBarComponents.mask;
        this.leds = ledBarComponents.leds;
        this.ledColors = ledBarComponents.ledColors;
        this.numLeds = this.leds.length;
        app.current.stage.addChild(this.mask);
        app.current.stage.addChild(this.ledBar);
        this.ledBar.interactive = true;
        this.ledBar.buttonMode = true;
        this.ledBar
            .on('pointerdown', this.onDragStart.bind(this))

        this.dragging = false;
    }
}

class Led {
    constructor(x, color, ledbarId, ledSize = 20) {
        this.graphics = new PIXI.Graphics();
        this.graphics.beginFill(color);
        this.graphics.drawRect(0, 0, ledSize, ledSize); // Draw the LED
        this.graphics.endFill();
        this.graphics.x = x;
        this.ledbarId = ledbarId;
        this.color = color;
        
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
        this.graphics.beginFill(color);
        this.graphics.drawRect(0, 0, this.ledSize, this.ledSize); // Draw the LED
        this.graphics.endFill();
    }

    // Other methods related to LED can be added here, such as setColor, getId, etc.
}

// Function to create the LED bar
function createLEDBar(colorList, startPoint, endPoint, ledbarId, numberOfLeds = 10, ledSize = 20) {
    let ledBar = new PIXI.Container();
    let dx = endPoint.x - startPoint.x;
    let dy = endPoint.y - startPoint.y;
    let angle = Math.atan2(dy, dx);
    let leds = [];
    let ledColors = [];

    let mask = new PIXI.Graphics();
    mask.beginFill(0xffffff);
    mask.drawRect(0, 0, numberOfLeds * ledSize, ledSize); // Width should match the LED bar length
    mask.endFill();

    mask.x = startPoint.x;
    mask.y = startPoint.y;
    mask.rotation = angle;

    for (let i = 0; i < numberOfLeds; i++) {
        let color = colorList[i];
        let led = new Led(i * ledSize, color, ledbarId, ledSize);
        leds.push(led);
        ledColors.push(color);
        ledBar.addChild(led.displayObject);
    }

    let blurFilter = new PIXI.BlurFilter();
    blurFilter.blur = 10;
    ledBar.filters = [blurFilter];
    // ledBar.mask = mask;

    ledBar.rotation = angle;
    ledBar.x = startPoint.x;
    ledBar.y = startPoint.y;
    return { ledBar, mask, leds, ledColors };
}


function drawRealisticLedBar(startHandle, endHandle, ledbarId, colors = null, ledSize = 20){
    let start = startHandle.coord;
    let end = endHandle.coord;
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let numberOfLeds = Math.ceil(distance / ledSize) - 1;
    let colorList = colors;
    if (colorList === null || colorList.length !== numberOfLeds) {
        colorList = generateRandomColors(numberOfLeds);
    }
    const { ledBar, mask, leds, ledColors } = createLEDBar(colorList, start, end, ledbarId, numberOfLeds, ledSize);
    return { ledBar, mask, leds, ledColors };    
};

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

    updatePosition(newCoord) {
        this.coord = newCoord;
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
        const handleId = this.id;
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
        }
        app.current.stage.off('pointermove', onDragMove);
    }

}

class Cable {
    constructor(startHandle, endHandle) {
        this.startHandle = startHandle;
        this.endHandle = endHandle;
        this.id = Math.random().toString(36).substr(2, 9); // Generate a random ID
        this.spline = null;
        this.drawSpline(startHandle.coord, endHandle.coord);
    }

    drawArrow(start, end, cp1, cp2) {
        // Calculate midpoint for the arrow
        const t = 0.5; // Midpoint of the curve
        const mt = 1 - t;
        const x = mt * mt * mt * start.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * end.x;
        const y = mt * mt * mt * start.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * end.y;
    
        // Arrow properties
        const arrowLength = 10;
        const arrowWidth = 7;
    
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


}

function onDragEnd()
{
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
            const newPosition = app.current.stage.toLocal(event.global, null, dragTarget.position);
            activeDragItem.coord = dragTarget.position;
            activeDragItem.updatePosition(newPosition);
            const linkedLedBarId = activeDragItem.ledBarId;
            const linkedLedBar = inventoryManager.getLedBarById(linkedLedBarId);
            if (linkedLedBar) {
                linkedLedBar.updatePosition(activeDragItem, activeDragItem === linkedLedBar.startPoint);
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
        ledBarConfigs.forEach(ledBarData => {
            if(ledBarData.id >= Object.keys(inventoryManager.ledBars).length){
                new LedBar(ledBarData.start, ledBarData.end, ledBarData.id);
            }   
        });
    }, [ledBarConfigs]);

    useEffect(() => {
        isCableEditing = isCableEditingMode;
    }, [isCableEditingMode]);

    useEffect(() => {
        if (powerSource.handle.linkedHandle !== null){
            inventoryManager.reassignIds();
            globalLedManager.reassignIds();
            // for the amount of leds in ledbar with id 0, we create a list of hex codes for red
            let colors = [];
            for (let i = 0; i < inventoryManager.getLedBarById(0).numLeds*2; i++) { 
                colors.push(0xFF0000);
            }
            globalLedManager.applyColors(colors);
        }
        
    }, [isLightsOn]);

    return (
        <div ref={pixiContainer} />
    );
};

export default PixiCanvas;