FROM registry.cn-hangzhou.aliyuncs.com/yugali/python:3.12.1-slim-bullseye

RUN apt-get -y update && apt-get install -y --no-install-recommends \
    vim libmariadb-dev pkg-config gcc netcat ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
