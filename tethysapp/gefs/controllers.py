from django.shortcuts import render
from utils import listLayers,convert_shp,get_polygon_stats,get_feature_stats
from django.http import JsonResponse, Http404, HttpResponse
import json
import shapely.geometry, shapely.ops

def home(request):
    """
    Controller for the app home page.
    """
    gefs_layers,geoserver_wms_url,geoserver_workspace = listLayers()

    context = {
        'gefs_layers':json.dumps(gefs_layers),
        'geoserver_wms_url':geoserver_wms_url,
        'geoserver_workspace':geoserver_workspace
    }

    return render(request, 'gefs/home.html', context)

def get_ts(request):

    return_obj = {}

    if request.is_ajax() and request.method == 'POST':

        fType = request.POST["fType"]
        interaction = request.POST["interaction"]
        if interaction == 'Polygon':
            geom_data = request.POST["geom_data"]
            try:
                res_val = get_polygon_stats(geom_data,fType)
                return_obj["data"] = res_val
                return_obj["success"] = "success"
            except Exception as e:
                return_obj["error"] = "Error processing request: "+ str(e)
        else:
            geom_data = request.POST.getlist("geom_data[]")
            try:
                res_val = get_feature_stats(geom_data, fType)
                return_obj["data"] = res_val
                return_obj["success"] = "success"
            except Exception as e:
                return_obj["error"] = "Error processing request: "+ str(e)

    return JsonResponse(return_obj)

def upload_shp(request):

    return_obj = {
        'success':False
    }

    #Check if its an ajax post request
    if request.is_ajax() and request.method == 'POST':
        #Gettings the file list and converting the files to a geojson object. See utilities.py for the convert_shp function.
        file_list = request.FILES.getlist('files')
        shp_json = convert_shp(file_list)
        gjson_obj = json.loads(shp_json)
        geometry = gjson_obj["features"][0]["geometry"]
        shape_obj = shapely.geometry.asShape(geometry)
        poly_bounds = shape_obj.bounds

        #Returning the bounds and the geo_json object as a json object
        return_obj["bounds"] = poly_bounds
        return_obj["geo_json"] = gjson_obj
        return_obj["success"] = True

    return JsonResponse(return_obj)