from app import Gefs as app
from ftplib import FTP
import re
import os.path as path
import gzip
import os
import sys
from geoserver.catalog import Catalog
import geoserver
import requests
import config as cfg
import time
import shutil
import pwd,grp
gzFilePattern = re.compile(r"\.tif\.gz$")
patternWithoutgz = re.compile(r"(.*)\.gz$")
firstftpdir = '/pub/org/chg/products/EWX/data/forecasts/CHIRPS-GEFS_precip/dekad_first/'
lastftpdir = '/pub/org/chg/products/EWX/data/forecasts/CHIRPS-GEFS_precip/dekad_last/'
validFile = re.compile(r"\.tif")
appWorkspace = app.get_app_workspace()

def gunzipFile(fileInput):
    '''

    :param fileInput:
    '''

    dirFile = path.dirname(fileInput)
    filename = path.basename(fileInput)
    m = patternWithoutgz.search(filename)
    fileWithoutgz = m.group(1)
    filetogunzip = fileInput
    fileOut = dirFile + "/" + fileWithoutgz
    f_in = gzip.open(filetogunzip, 'rb')
    f_out = open(fileOut, 'wb')
    f_out.writelines(f_in)
    f_out.close()
    f_in.close()

    ##Remove the gzip file
    os.remove(filetogunzip)




def getLatestForecast(ftp,ftpWD,gefsType,num):
    '''

    :param ftp:
    :param yearToGet:
    :param monthToGet:
    '''

    ftp = FTP(ftp)
    ftp.login()
    ftp.set_pasv(True)
    ftp.cwd(ftpWD)
    files = ftp.nlst()
    outputDir = None
    # uid = pwd.getpwnam('www-data').pw_uid
    # gid = grp.getgrnam('www-data').gr_gid

    if 'first' in ftpWD:
        outputDir = os.path.join(appWorkspace.path,'gefs_'+str(gefsType)+'_first')
    if 'last' in ftpWD:
        outputDir = os.path.join(appWorkspace.path,'gefs_'+str(gefsType)+'_last')

    if not os.path.exists(outputDir):
        os.makedirs(outputDir)

        # os.chown(outputDir, uid, gid)

    for the_file in os.listdir(outputDir):
        file_path = os.path.join(outputDir, the_file)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
        except Exception as e:
            print(e)

    filteredfiles = [f for f in files if gefsType in f][-num:]
    for fileToProcess in filteredfiles:
        if validFile.search(fileToProcess):
            if re.search(gefsType, fileToProcess):
                print("Downloading "+str(fileToProcess))
                fileToWriteTo = open(outputDir+"/" + fileToProcess, 'wb')
                ftp.retrbinary('RETR ' + fileToProcess, fileToWriteTo.write)
                fileToWriteTo.close()
                # os.chown(os.path.join(outputDir,fileToWriteTo), uid, gid)
    ftp.close()


#def get_latest_forecast():
def cleanup():
    #Delete any existing folders
    existingDirs = os.path.join(appWorkspace.path,'')
    for dir in os.listdir(existingDirs):
        shutil.rmtree(os.path.join(existingDirs,dir), ignore_errors=True)

    #Delete stores from geoserver
    cat = Catalog(cfg.geoserver['rest_url'], username=cfg.geoserver['user'], password=cfg.geoserver['password'])
    stores = cat.get_stores(workspace=cfg.geoserver['workspace'])

    for store in stores:
        cat.delete(store, recurse=True)
    cat.reload()



def uploadForecast(gefsType,fType):
    inputDir = os.path.join(appWorkspace.path, 'gefs_' + str(gefsType)+'_'+str(fType))

    headers = {
        'Content-type': 'image/tiff',
    }
    user = cfg.geoserver['user']
    password = cfg.geoserver['password']
    rest_url = cfg.geoserver['rest_url']
    if rest_url.endswith('/'):
        rest_url = rest_url[:-1]

    for file in sorted(os.listdir(inputDir)):
        if validFile.search(file):
            data = open(os.path.join(inputDir,file),'rb').read()
            storename = fType + '_' +gefsType + '_' +file.split('.')[2] + '_' + file.split('.')[1]

            request_url = '{0}/workspaces/{1}/coveragestores/{2}/file.geotiff'.format(rest_url,
                                                                                     cfg.geoserver['workspace'],
                                                                                     storename)  # Creating the rest url

            print 'Uploading store ' +str(storename) + ' to geoserver'
            requests.put(request_url, headers=headers, data=data,
                         auth=(user, password))

start_time = time.time()
cleanup()
getLatestForecast('chg-ftpout.geog.ucsb.edu',firstftpdir,'anom',6)
getLatestForecast('chg-ftpout.geog.ucsb.edu',firstftpdir,'data',6)
getLatestForecast('chg-ftpout.geog.ucsb.edu',lastftpdir,'anom',6)
getLatestForecast('chg-ftpout.geog.ucsb.edu',lastftpdir,'data',6)
uploadForecast('data','first')
uploadForecast('anom','first')
uploadForecast('data','last')
uploadForecast('anom','last')

elapsed_time = time.time() - start_time

print time.strftime("%H:%M:%S", time.gmtime(elapsed_time))