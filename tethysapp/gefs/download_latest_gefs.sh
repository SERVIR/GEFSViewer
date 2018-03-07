#!/bin/bash
TETHYS_HOME=~/tethys
CONDA_HOME="${TETHYS_HOME}/miniconda"
CONDA_ENV_NAME='tethys'
ACTIVATE_DIR="${CONDA_HOME}/envs/${CONDA_ENV_NAME}/etc/conda/activate.d"
DEACTIVATE_DIR="${CONDA_HOME}/envs/${CONDA_ENV_NAME}/etc/conda/deactivate.d"
ACTIVATE_SCRIPT="${ACTIVATE_DIR}/tethys-activate.sh"
DEACTIVATE_SCRIPT="${DEACTIVATE_DIR}/tethys-deactivate.sh"
BASH_PROFILE=".bashrc"
ACTIVATE_SCRIPT="${ACTIVATE_DIR}/tethys-activate.sh"
DEACTIVATE_SCRIPT="${DEACTIVATE_DIR}/tethys-deactivate.sh"
NGINX_USER=$(grep 'user .*;' /etc/nginx/nginx.conf | awk '{print $2}' | awk -F';' '{print $1}')
NGINX_GROUP=${NGINX_USER}
NGINX_HOME=$(grep ${NGINX_USER} /etc/passwd | awk -F':' '{print $6}')
USER='prod'
if [ "$(uname)" = "Linux" ]
    then
	
        #. /home/Socrates/spulla/tethys/miniconda/bin/activate tethys
	echo $NGINX_USER
	sudo chown -R ${USER} ${TETHYS_HOME}/src ${TETHYS_HOME}/static ${TETHYS_HOME}/workspaces ${TETHYS_HOME}/apps
	. ${CONDA_HOME}/bin/activate ${CONDA_ENV_NAME}
	python ${TETHYS_HOME}/src/tethys_apps/tethysapp/gefs/gefs.py
	sudo chown -R ${NGINX_USER}:${NGINX_USER} ${TETHYS_HOME}/src ${TETHYS_HOME}/static ${TETHYS_HOME}/workspaces ${TETHYS_HOME}/apps
        sudo systemctl restart tethys.uwsgi.service
        sudo systemctl restart nginx
fi
