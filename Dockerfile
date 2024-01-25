FROM python:3.12

# Copy repo
WORKDIR /code
COPY . .

# Install python dependencies
RUN pip install -r requirements.txt

# Set environment variables
# TODO: GitHub Environment Variables setting
# ENV NAVER_MAP_API_ID 
# ENV NAVER_MAP_API_KEY 

# Run container
EXPOSE 80
CMD ["python", "-m", "uvicorn", "main:app", "--port", "80", "--host", "0.0.0.0"]