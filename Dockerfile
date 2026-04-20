# base stage
FROM ubuntu:24.04 AS base
USER root
SHELL ["/bin/bash", "-c"]

ARG NEED_MIRROR=0
ARG NGINX_VERSION=1.29.5-1~noble

WORKDIR /ragflow

# Copy models downloaded via download_deps.py
RUN mkdir -p /ragflow/rag/res/deepdoc /root/.ragflow

RUN --mount=type=bind,from=infiniflow/ragflow_deps:latest,source=/huggingface.co,target=/huggingface.co \
    tar --exclude='.*' -cf - \
        /huggingface.co/InfiniFlow/text_concat_xgb_v1.0 \
        /huggingface.co/InfiniFlow/deepdoc \
    | tar -xf - --strip-components=3 -C /ragflow/rag/res/deepdoc

# https://github.com/chrismattmann/tika-python
# This is the only way to run python-tika without internet access.
RUN --mount=type=bind,from=infiniflow/ragflow_deps:latest,source=/,target=/deps \
    cp -r /deps/nltk_data /root/ && \
    cp /deps/tika-server-standard-3.2.3.jar /deps/tika-server-standard-3.2.3.jar.md5 /ragflow/ && \
    cp /deps/cl100k_base.tiktoken /ragflow/9b5ad71b2ce5302211f9c61530b329a4922fc6a4

ENV TIKA_SERVER_JAR="file:///ragflow/tika-server-standard-3.2.3.jar"
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
ENV PATH=/root/.local/bin:$PATH
ENV PATH="/root/.cargo/bin:${PATH}"

# Setup apt
# Python package and implicit dependencies:
# opencv-python: libglib2.0-0 libglx-mesa0 libgl1
# python-pptx:   default-jdk tika-server-standard-3.2.3.jar
# selenium:      libatk-bridge2.0-0 chrome-linux64-121-0-6167-85
# Building C extensions: libpython3-dev libgtk-4-1 libnss3 xdg-utils libgbm-dev
RUN --mount=type=cache,id=ragflow_apt,target=/var/cache/apt,sharing=locked \
    set -eux; \
    if [ "$NEED_MIRROR" = "1" ]; then \
        sed -i 's|http://archive.ubuntu.com/ubuntu|http://mirrors.aliyun.com/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources; \
        sed -i 's|http://security.ubuntu.com/ubuntu|http://mirrors.aliyun.com/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources; \
    fi; \
    rm -f /etc/apt/apt.conf.d/docker-clean; \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache; \
    chmod 1777 /tmp; \
    for i in 1 2 3; do apt-get update && break || sleep 5; done; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        wget \
        gnupg \
        unzip \
        git \
        vim \
        less \
        build-essential \
        pkg-config \
        libicu-dev \
        libgdiplus \
        libglib2.0-0 \
        libglx-mesa0 \
        libgl1 \
        default-jdk \
        libatk-bridge2.0-0 \
        libpython3-dev \
        libgtk-4-1 \
        libnss3 \
        xdg-utils \
        libgbm-dev \
        libjemalloc-dev \
        ghostscript \
        pandoc \
        texlive \
        fonts-freefont-ttf \
        fonts-noto-cjk \
        postgresql-client \
        unixodbc-dev; \
    rm -rf /var/lib/apt/lists/*

# Nginx
RUN --mount=type=cache,id=ragflow_apt,target=/var/cache/apt,sharing=locked \
    set -eux; \
    mkdir -p /etc/apt/keyrings; \
    curl -fsSL https://nginx.org/keys/nginx_signing.key | gpg --dearmor -o /etc/apt/keyrings/nginx-archive-keyring.gpg; \
    echo "deb [signed-by=/etc/apt/keyrings/nginx-archive-keyring.gpg] https://nginx.org/packages/mainline/ubuntu/ noble nginx" > /etc/apt/sources.list.d/nginx.list; \
    for i in 1 2 3; do apt-get update && break || sleep 5; done; \
    apt-get install -y nginx=${NGINX_VERSION}; \
    apt-mark hold nginx; \
    rm -rf /var/lib/apt/lists/*

# Install uv
RUN --mount=type=bind,from=infiniflow/ragflow_deps:latest,source=/,target=/deps \
    set -eux; \
    if [ "$NEED_MIRROR" = "1" ]; then \
        mkdir -p /etc/uv; \
        echo 'python-install-mirror = "https://registry.npmmirror.com/-/binary/python-build-standalone/"' > /etc/uv/uv.toml; \
        echo '[[index]]' >> /etc/uv/uv.toml; \
        echo 'url = "https://pypi.tuna.tsinghua.edu.cn/simple"' >> /etc/uv/uv.toml; \
        echo 'default = true' >> /etc/uv/uv.toml; \
    fi; \
    arch="$(uname -m)"; \
    if [ "$arch" = "x86_64" ]; then uv_arch="x86_64"; else uv_arch="aarch64"; fi; \
    tar xzf "/deps/uv-${uv_arch}-unknown-linux-gnu.tar.gz"; \
    cp "uv-${uv_arch}-unknown-linux-gnu/"* /usr/local/bin/; \
    rm -rf "uv-${uv_arch}-unknown-linux-gnu"; \
    uv python install 3.12

# nodejs 20
RUN --mount=type=cache,id=ragflow_apt,target=/var/cache/apt,sharing=locked \
    set -eux; \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; \
    apt-get purge -y nodejs npm cargo || true; \
    apt-get autoremove -y || true; \
    for i in 1 2 3; do apt-get update && break || sleep 5; done; \
    apt-get install -y nodejs; \
    rm -rf /var/lib/apt/lists/*

# Rust
RUN set -eux; \
    export CARGO_HOME=/root/.cargo; \
    export RUSTUP_HOME=/root/.rustup; \
    if [ "$NEED_MIRROR" = "1" ]; then \
        export RUSTUP_DIST_SERVER="https://mirrors.tuna.tsinghua.edu.cn/rustup"; \
        export RUSTUP_UPDATE_ROOT="https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup"; \
        echo "Using TUNA mirrors for Rustup."; \
    fi; \
    curl --proto '=https' --tlsv1.2 --http1.1 -fsSL https://sh.rustup.rs -o /tmp/rustup-init.sh; \
    bash /tmp/rustup-init.sh -y --profile minimal; \
    test -x /root/.cargo/bin/cargo; \
    test -x /root/.cargo/bin/rustc; \
    /root/.cargo/bin/cargo --version; \
    /root/.cargo/bin/rustc --version; \
    rm -f /tmp/rustup-init.sh

ENV PATH="/root/.cargo/bin:${PATH}"

# Add Microsoft ODBC driver
# ARM64: msodbcsql18
# x86_64: msodbcsql17
RUN --mount=type=cache,id=ragflow_apt,target=/var/cache/apt,sharing=locked \
    set -eux; \
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/ubuntu/24.04/prod noble main" > /etc/apt/sources.list.d/mssql-release.list; \
    for i in 1 2 3; do apt-get update && break || sleep 5; done; \
    arch="$(uname -m)"; \
    ACCEPT_EULA=Y apt-get install -y msodbcsql18

# Add dependencies of selenium
RUN --mount=type=bind,from=infiniflow/ragflow_deps:latest,source=/chrome-linux64-121-0-6167-85,target=/chrome-linux64.zip \
    unzip /chrome-linux64.zip && \
    mv chrome-linux64 /opt/chrome && \
    ln -s /opt/chrome/chrome /usr/local/bin/

RUN --mount=type=bind,from=infiniflow/ragflow_deps:latest,source=/chromedriver-linux64-121-0-6167-85,target=/chromedriver-linux64.zip \
    unzip -j /chromedriver-linux64.zip chromedriver-linux64/chromedriver && \
    mv chromedriver /usr/local/bin/ && \
    rm -f /usr/bin/google-chrome

RUN --mount=type=bind,from=infiniflow/ragflow_deps:latest,source=/,target=/deps \
    if [ "$(uname -m)" = "x86_64" ]; then \
        dpkg -i /deps/libssl1.1_1.1.1f-1ubuntu2_amd64.deb; \
    elif [ "$(uname -m)" = "aarch64" ]; then \
        dpkg -i /deps/libssl1.1_1.1.1f-1ubuntu2_arm64.deb; \
    fi

# builder stage
FROM base AS builder
USER root

WORKDIR /ragflow

# install dependencies from uv.lock file
COPY pyproject.toml uv.lock ./

# https://github.com/astral-sh/uv/issues/10462
# uv records index url into uv.lock but doesn't failover among multiple indexes
RUN --mount=type=cache,id=ragflow_uv,target=/root/.cache/uv,sharing=locked \
    set -eux; \
    if [ "$NEED_MIRROR" = "1" ]; then \
        sed -i 's|pypi.org|pypi.tuna.tsinghua.edu.cn|g' uv.lock; \
    else \
        sed -i 's|pypi.tuna.tsinghua.edu.cn|pypi.org|g' uv.lock; \
    fi; \
    uv sync --python 3.12 --frozen && \
    .venv/bin/python3 -m ensurepip --upgrade

COPY web web
COPY docs docs

RUN --mount=type=cache,id=ragflow_npm,target=/root/.npm,sharing=locked \
    set -eux; \
    if [ "$NEED_MIRROR" = "1" ]; then \
        npm config set registry https://registry.npmmirror.com; \
    fi; \
    export NODE_OPTIONS="--max-old-space-size=4096"; \
    cd web && npm install && npm run build

COPY .git /ragflow/.git

RUN version_info=$(git describe --tags --match=v* --first-parent --always); \
    echo "RAGFlow version: $version_info"; \
    echo "$version_info" > /ragflow/VERSION

# production stage
FROM base AS production
USER root

WORKDIR /ragflow

ENV VIRTUAL_ENV=/ragflow/.venv
COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

ENV PYTHONPATH=/ragflow/

COPY web web
COPY admin admin
COPY api api
COPY conf conf
COPY deepdoc deepdoc
COPY rag rag
COPY agent agent
COPY pyproject.toml uv.lock ./
COPY mcp mcp
COPY common common
COPY memory memory

COPY docker/service_conf.yaml.template ./conf/service_conf.yaml.template
COPY docker/entrypoint.sh ./
RUN chmod +x ./entrypoint*.sh

COPY --from=builder /ragflow/web/dist /ragflow/web/dist
COPY --from=builder /ragflow/VERSION /ragflow/VERSION

ENTRYPOINT ["./entrypoint.sh"]