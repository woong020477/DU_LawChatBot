FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-devel
USER root

WORKDIR /app
ADD . /app

RUN pip install jupyterlab
RUN pip install -r /app/requirements.txt

EXPOSE 8888
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root", "--NotebookApp.token=''"]


#docker run -d --shm-size=256m --gpus '"device=0,1,2,3"' -p 8886:8888 -v /data/swheo/:/workspace --name jupyter8886 pytorch/pytorch:2.0.1-cuda11.7-cudnn8-devel /bin/bash  
