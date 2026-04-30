FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    clamav \
    clamav-freshclam \
    curl \
    unzip \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

RUN python3 -m venv /opt/semgrep-venv
RUN /opt/semgrep-venv/bin/pip install --no-cache-dir semgrep
ENV PATH="/opt/semgrep-venv/bin:${PATH}"

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY worker.js ./

CMD ["npm", "start"]
