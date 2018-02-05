import config as cfg
from geoserver.catalog import Catalog
import datetime
from collections import defaultdict,OrderedDict
import json
import operator
import os, tempfile, shutil,functools
import gdal
import ogr
import osr
import requests, urlparse
import csv
import json
import calendar
import shapely.geometry, shapely.ops
import fiona
import pyproj
import geojson, ast
from app import Gefs as app
from rasterstats import zonal_stats
import time
appWorkspace = app.get_app_workspace()

def listLayers():
    cat = Catalog(cfg.geoserver['rest_url'], username=cfg.geoserver['user'], password=cfg.geoserver['password'])
    stores = cat.get_stores(workspace=cfg.geoserver['workspace'])
    d = defaultdict(list)
    for store in sorted(stores):
        fstore = store.name.split('_')
        fType = fstore[0]
        gefsType = fstore[1]

        decad = fstore[2][-1]
        month = fstore[2][:2]
        year = fstore[3]
        fMonth = datetime.date(int(year), int(month), 1).strftime('%B')
        dIndex = getIndexBasedOnDecad(int(decad),int(month))
        dateVal = getDateBasedOnIndex(dIndex,int(year))
        d[str(fType) + '_' + str(gefsType)].append([('Dekad '+str(decad)+', '+str(fMonth)+' '+str(year)),store.name,dateVal.strftime('%Y-%m-%d')])

    return dict(d),cfg.geoserver['wms_url'],cfg.geoserver['workspace']

def getIndexBasedOnDecad(decad, month):
    tIn = [x for x in range(0, 36)]
    decadChunks = [tIn[i:i + 3] for i in xrange(0, len(tIn), 3)]

    return int(decadChunks[int(month) - 1][int(decad) - 1])

def getDateBasedOnIndex(index, year):
    tIn = [x for x in range(0, 36)]
    decadChunks = [tIn[i:i + 3] for i in xrange(0, len(tIn), 3)]
    decadIndex = [[i, j] for i, lst in enumerate(decadChunks) for j, pos in enumerate(lst) if pos == index]
    month = int((decadIndex)[0][0]) + 1
    decad = int((decadIndex)[0][1]) + 1
    if int(decad) != int(3):
        return datetime.datetime(year, month, 10) + datetime.timedelta(decadIndex[0][1] * 10.)
    else:
        any_day = datetime.datetime(year, month, 10)
        next_month = any_day.replace(day=28) + datetime.timedelta(days=4)
        return next_month - datetime.timedelta(days=next_month.day)

#Conver the shapefiles into a geojson object
def convert_shp(files):

    #Initizalizing an empty geojson string.
    geojson_string = ''

    try:
        #Storing the uploaded files in a temporary directory
        temp_dir = tempfile.mkdtemp()
        for f in files:
            f_name = f.name
            f_path = os.path.join(temp_dir,f_name)

            with open(f_path,'wb') as f_local:
                f_local.write(f.read())

        #Getting a list of files within the temporary directory
        for file in os.listdir(temp_dir):
            #Reading the shapefile only
            if file.endswith(".shp"):
                f_path = os.path.join(temp_dir,file)
                omit = ['SHAPE_AREA', 'SHAPE_LEN']

                #Reading the shapefile with fiona and reprojecting it
                with fiona.open(f_path) as source:
                    project = functools.partial(pyproj.transform,
                                                pyproj.Proj(**source.crs),
                                                pyproj.Proj(init='epsg:3857'))
                    features = []
                    for f in source:
                        shape = shapely.geometry.shape(f['geometry']) #Getting the shape of the shapefile
                        projected_shape = shapely.ops.transform(project, shape) #Transforming the shapefile

                        # Remove the properties we don't want
                        props = f['properties']  # props is a reference
                        for k in omit:
                            if k in props:
                                del props[k]

                        feature = geojson.Feature(id=f['id'],
                                                  geometry=projected_shape,
                                                  properties=props) #Creating a geojson feature by extracting properties through the fiona and shapely.geometry module
                        features.append(feature)
                    fc = geojson.FeatureCollection(features)

                    geojson_string = geojson.dumps(fc) #Creating the geojson string


    except:
        return 'error'
    finally:
        #Delete the temporary directory once the geojson string is created
        if temp_dir is not None:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

    return geojson_string

def get_polygon_stats(geom_data,fType):
    json_obj = {}
    fType = fType.split('_')
    input_folder = os.path.join(appWorkspace.path, 'gefs_' + str(fType[1])+'_'+str(fType[0]))
    min = []
    mean = []
    max = []
    median = []
    for file in os.listdir(input_folder):
        if file.endswith('.tif'):
            stats = zonal_stats(geom_data, os.path.join(input_folder,file),
                        stats="min mean max median")
            f_val = file.split('.')
            year = f_val[1]
            decad = f_val[2][-1]
            month = f_val[2][:2]
            dateVal = getDateBasedOnIndex(getIndexBasedOnDecad(int(decad), int(month)), int(year))
            time_stamp = time.mktime(dateVal.timetuple()) * 1000

            min.append([time_stamp, stats[0]["min"]])
            max.append([time_stamp, stats[0]["max"]])
            median.append([time_stamp, stats[0]["median"]])
            mean.append([time_stamp, stats[0]["mean"]])

    json_obj["min_data"] = sorted(min)
    json_obj["max_data"] = sorted(max)
    json_obj["median_data"] = sorted(median)
    json_obj["mean_data"] = sorted(mean)

    return json_obj

def get_feature_stats(geom_data,fType):
    json_obj = {}
    fType = fType.split('_')
    input_folder = os.path.join(appWorkspace.path, 'gefs_' + str(fType[1])+'_'+str(fType[0]))
    # g_data = json.loads(geom_data)
    # print g_data["id"]
    features = []
    for i,val in enumerate(geom_data):
        gl_data = ast.literal_eval(geom_data[i])
        features.append(gl_data)

    geom_collection = geojson.FeatureCollection(features)
    min = []
    mean = []
    max = []
    median = []
    for file in os.listdir(input_folder):
        if file.endswith('.tif'):
            stats = zonal_stats(geom_collection, os.path.join(input_folder, file),
                                stats="min mean max median")

            f_val = file.split('.')
            year = f_val[1]
            decad = f_val[2][-1]
            month = f_val[2][:2]
            dateVal = getDateBasedOnIndex(getIndexBasedOnDecad(int(decad),int(month)), int(year))
            time_stamp = time.mktime(dateVal.timetuple()) * 1000
            # stats[0]["time_stamp"] = time_stamp
            min.append([time_stamp,stats[0]["min"]])
            max.append([time_stamp, stats[0]["max"]])
            median.append([time_stamp, stats[0]["median"]])
            mean.append([time_stamp, stats[0]["mean"]])

    json_obj["min_data"] = sorted(min)
    json_obj["max_data"] = sorted(max)
    json_obj["median_data"] = sorted(median)
    json_obj["mean_data"] = sorted(mean)

    return json_obj

