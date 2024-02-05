FROM python:3.11-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    pulseaudio \
    gcc \
    portaudio19-dev \
    cmake  # Add cmake here to ensure it's available for samplerate compilation

# User setup
RUN useradd -l --create-home ledfx \
    && adduser ledfx pulse-access 
    # && usermod -aG sudo ledfx \
    # && echo "ledfx ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

WORKDIR /home/ledfx
ENV PATH="/home/ledfx/.local/bin:$PATH"

# Switch to user context
USER ledfx

# Install Python dependencies
RUN pip install --upgrade pip wheel setuptools --no-cache-dir \
    && pip install numpy~=1.23 --no-cache-dir \
    && pip install git+https://github.com/LedFx/LedFx --no-cache-dir

# Expose LedFx default port
EXPOSE 8888/tcp

# Set the entrypoint
ENTRYPOINT [ "ledfx" ]

