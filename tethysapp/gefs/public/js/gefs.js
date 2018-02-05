/*****************************************************************************
 * FILE:    GEFS MAIN JS
 * DATE:    1 JANUARY 2018
 * AUTHOR: Sarva Pulla
 * COPYRIGHT: (c) NASA SERVIR 2018
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var LIBRARY_OBJECT = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library

    /************************************************************************
     *                      MODULE LEVEL / GLOBAL VARIABLES
     *************************************************************************/
    var adminOneTileLayer,
        adminTwoTileLayer,
        animateOptions,
        $btnUpload,
        $btnGetPlot,
        countryTileLayer,
        animationDelay,
        current_layer,
        date_display,
        element,
        featureType,
        gefs_layers,
        layers,
        map,
        $modalUpload,
        $modalChart,
        popup,
        prepare_files,
        proj_coords,
        public_interface,			// Object returned by the module
        sliderInterval,
        select_layer,
        select_source,
        selectedFeatures,
        shp_layer,
        shp_source,
        tLen,
        upload_file,
        wms_workspace,
        wms_url,
        wms_layer,
        wms_source;


    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var add_wms,
        animate,
        clear_coords,
        get_styling,
        get_ts,
        gen_color_bar,
        init_events,
        init_jquery_vars,
        init_dropdown,
        init_all,
        init_map,
        init_slider,
        turn_off_utilsLayers,
        update_info,
        update_wms;


    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/
    animate = function(){
        $("#types").val("None").trigger('change');
        // var sliderVal = $("#slider").slider("value");
        // sliderInterval = setInterval(function() {
        //     sliderVal += 1;
        //     if (sliderVal === tLen) sliderVal=0;
        //     $("#slider").slider("value", sliderVal);
        // }, animationDelay);
        var count = 0;
        sliderInterval = setInterval(function() {
            count += 1;
            if (count === tLen) count=0;
            $("#time_table").select2().val(animateOptions[count][1]).trigger('change');
        }, animationDelay);

    };
    $(".btn-run").on("click", animate);
    //Set the slider value to the current value to start the animation at the );
    $(".btn-stop").on("click", function() {
        //Call clearInterval to stop the animation.
        clearInterval(sliderInterval);
    });

    clear_coords = function(){
        $("#poly-lat-lon").val('');
        $("#shp-lat-lon").val('');
    };


    init_jquery_vars = function(){

        var $gefs_element = $("#gefs");
        gefs_layers = $gefs_element.attr('data-gefs-layers');
        gefs_layers = JSON.parse(gefs_layers);
        $modalUpload = $("#modalUpload");
        $modalChart = $("#chart-modal");
        $btnUpload = $("#btn-add-shp");
        $btnGetPlot = $("#btn-get-plot");
        wms_url = $gefs_element.attr('data-geoserver-url');
        wms_workspace = $gefs_element.attr('data-geoserver-workspace');
        animationDelay = 2000;
    };

    init_dropdown = function () {
        $(".f_table").select2();
        $(".time_table").select2();
    };

    init_map = function() {
        var projection = ol.proj.get('EPSG:3857');
        var baseLayer = new ol.layer.Tile({
            source: new ol.source.BingMaps({
                key: '5TC0yID7CYaqv3nVQLKe~xWVt4aXWMJq2Ed72cO4xsA~ApdeyQwHyH_btMjQS1NJ7OHKY8BK-W-EMQMrIavoQUMYXeZIQOUURnKGBOC7UCt4',
                imagerySet: 'AerialWithLabels' // Options 'Aerial', 'AerialWithLabels', 'Road'
            })
        });
        var fullScreenControl = new ol.control.FullScreen();
        var view = new ol.View({
            center: ol.proj.transform([39.669571,-4.036878], 'EPSG:4326','EPSG:3857'),
            projection: projection,
            zoom: 4
        });
        shp_source = new ol.source.Vector();
        shp_layer = new ol.layer.Vector({
            source: shp_source
        });

        wms_source = new ol.source.ImageWMS({
            url: wms_url,
            params: {},
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });

        wms_layer = new ol.layer.Image({
            name: 'wms_layer',
            source: wms_source
        });

        var vector_source = new ol.source.Vector({
            wrapX: false
        });

        var vector_layer = new ol.layer.Vector({
            name: 'my_vectorlayer',
            source: vector_source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });

        var default_style = new ol.style.Style({
            fill: new ol.style.Fill({
                color: [250,250,250,0.1]
            }),
            stroke: new ol.style.Stroke({
                color: [220,220,220,1],
                width: 4
            })
        });

        select_source =  new ol.source.Vector();

        select_layer = new ol.layer.Vector({
            name:'select_layer',
            source: select_source,
            style:default_style
        });

        adminOneTileLayer = new ol.layer.Tile(
            {
                name: 'adminOne',
                source: new ol.source.TileWMS((
                    {
                        crossOrigin: 'anonymous',         // // KS Refactor Design 2016 Override // This should enable screenshot export around the CORS issue with Canvas.
                        url: 'http://tethys.servirglobal.net:8181/geoserver/wms',
                        params: {'LAYERS': 'utils:adminOne', 'TILED': true },
                        serverType: 'geoserver'
                    }))
            });

        adminTwoTileLayer = new ol.layer.Tile(
            {
                name:'adminTwo',
                source: new ol.source.TileWMS((
                    {

                        crossOrigin: 'anonymous',         // // KS Refactor Design 2016 Override // This should enable screenshot export around the CORS issue with Canvas.
                        url: 'http://tethys.servirglobal.net:8181/geoserver/wms',
                        params: {'LAYERS': 'utils:adminTwo', 'TILED': true },
                        serverType: 'geoserver'
                    }))
            });

        countryTileLayer = new ol.layer.Tile(
            {
                name:'country',
                source: new ol.source.TileWMS((
                    {
                        crossOrigin: 'anonymous',         // // KS Refactor Design 2016 Override // This should enable screenshot export around the CORS issue with Canvas.
                        url: 'http://tethys.servirglobal.net:8181/geoserver/wms',
                        params: {'LAYERS': 'utils:country', 'TILED': true },
                        serverType: 'geoserver'
                    }))
            });

        adminOneTileLayer.setVisible(false);
        adminTwoTileLayer.setVisible(false);
        countryTileLayer.setVisible(false);
        turn_off_utilsLayers();

        layers = [baseLayer,wms_layer,adminOneTileLayer,adminTwoTileLayer,countryTileLayer,select_layer,vector_layer,shp_layer];

        map = new ol.Map({
            target: document.getElementById("map"),
            layers: layers,
            view: view
        });

        map.crossOrigin = 'anonymous';
        element = document.getElementById('popup');

        popup = new ol.Overlay({
            element: element,
            positioning: 'bottom-center',
            stopEvent: true
        });

        map.addOverlay(popup);

        var mousePositionControl = new ol.control.MousePosition({
            coordinateFormat: ol.coordinate.createStringXY(4),
            projection: 'EPSG:4326',
            className: 'custom-mouse-position',
            target: document.getElementById('mouse-position'),
            undefinedHTML: '&nbsp;'
        });

        map.addControl(mousePositionControl);

        //Code for adding interaction for drawing on the map
        var lastFeature, draw, featureType;

        //Clear the last feature before adding a new feature to the map
        var removeLastFeature = function () {
            if (lastFeature) source.removeFeature(lastFeature);
        };

        //Add interaction to the map based on the selected interaction type
        var addInteraction = function (geomtype) {
            var typeSelect = document.getElementById('types');
            var value = typeSelect.value;
            $('#data').val('');
            if (value !== 'None') {
                if (draw)
                    map.removeInteraction(draw);

                draw = new ol.interaction.Draw({
                    source: vector_source,
                    type: geomtype
                });


                map.addInteraction(draw);
            }
            if (featureType === 'Polygon') {

                draw.on('drawend', function (e) {
                    lastFeature = e.feature;

                });

                draw.on('drawstart', function (e) {
                    vector_source.clear();
                });

            }


        };

        vector_layer.getSource().on('addfeature', function(event){
            //Extracting the point/polygon values from the drawn feature
            var feature_json = saveData();
            var parsed_feature = JSON.parse(feature_json);
            var feature_type = parsed_feature["features"][0]["geometry"]["type"];
            if (feature_type == 'Polygon'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
                proj_coords = [];
                coords.forEach(function (coord) {
                    var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
                    proj_coords.push('['+transformed+']');
                });
                var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
                $("#poly-lat-lon").val(json_object);
                $btnGetPlot.removeClass('disabled');
            }
        });
        function saveData() {
            // get the format the user has chosen
            var data_type = 'GeoJSON',
                // define a format the data shall be converted to
                format = new ol.format[data_type](),
                // this will be the data in the chosen format
                data;
            try {
                // convert the data of the vector_layer into the chosen format
                data = format.writeFeatures(vector_layer.getSource().getFeatures());
            } catch (e) {
                // at time of creation there is an error in the GPX format (18.7.2014)
                $('#data').val(e.name + ": " + e.message);
                return;
            }
            // $('#data').val(JSON.stringify(data, null, 4));
            return data;

        }

        $('#types').change(function (e) {
            $btnGetPlot.addClass('disabled');
            turn_off_utilsLayers();
            clear_coords();
            select_source.clear();
            selectedFeatures = [];
            featureType = $(this).find('option:selected').val();
            map.removeInteraction(draw);
            vector_layer.getSource().clear();
            shp_layer.getSource().clear();
            if(featureType == 'None')
            {
                wms_layer.setVisible(true);
            }else{
                wms_layer.setVisible(false);
            }

            if(featureType == 'None')
            {
                $('#data').val('');
                map.removeInteraction(draw);

            }else if(featureType == 'Upload')
            {
                $modalUpload.modal('show');

            }else if(featureType == 'Point')
            {

            }else if(featureType == 'Polygon'){
                addInteraction(featureType);
            }
            else if(featureType == 'adminOne'){
                adminOneTileLayer.setVisible(true);
            }
            else if(featureType == 'adminTwo'){
                adminTwoTileLayer.setVisible(true);
            }else if(featureType == 'country'){
                countryTileLayer.setVisible(true);
            }
        }).change();


    };


    init_events = function(){
        (function () {
            var target, observer, config;
            // select the target node
            target = $('#app-content-wrapper')[0];

            observer = new MutationObserver(function () {
                window.setTimeout(function () {
                    map.updateSize();
                }, 350);
            });
            $(window).on('resize', function () {
                map.updateSize();
            });

            config = {attributes: true};

            observer.observe(target, config);
        }());

        map.on("singleclick",function(evt){

            $(element).popover('destroy');


            if (map.getTargetElement().style.cursor == "pointer" && $("#types").find('option:selected').val()!="Polygon" && $("#types").find('option:selected').val()!="Upload") {
                var clickCoord = evt.coordinate;

                popup.setPosition(clickCoord);
                var view = map.getView();
                var viewResolution = view.getResolution();
                var wms_url = current_layer.getSource().getGetFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), {'INFO_FORMAT': 'application/json'}); //Get the wms url for the clicked point

                if (current_layer.get('name')=='wms_layer') {
                    //Retrieving the details for clicked point via the url
                    $.ajax({
                        type: "GET",
                        url: wms_url,
                        dataType: 'json',
                        success: function (result) {
                            var value = parseFloat(result["features"][0]["properties"]["GRAY_INDEX"]);
                            value = value.toFixed(2);
                            var projCoord = ol.proj.transform([clickCoord[0],clickCoord[1]], 'EPSG:3857','EPSG:4326');
                            document.getElementById('mousevalue').innerHTML = value + ' at Lon: '+ projCoord[0].toFixed(3)+', Lat: '+projCoord[1].toFixed(3);

                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            console.log(Error);
                        }
                    });
                }else if(current_layer.get('name')=='adminOne' || current_layer.get('name')=='adminTwo' || current_layer.get('name')=='country'){
                    $.ajax({
                        type: "GET",
                        url: wms_url,
                        dataType: 'json',
                        success: function (result) {
                            select_source.clear();
                            selectedFeatures = [];
                            var selFeature = result["features"][0];
                            var format = new ol.format.GeoJSON({
                                defaultDataProjection: 'EPSG:4326',
                                featureProjection: 'EPSG:3857'
                            });
                            var feature = format.readFeature(selFeature, {
                                dataProjection: 'EPSG:4326',
                                featureProjection: 'EPSG:3857'
                            });

                            if(selectedFeatures.indexOf(JSON.stringify(selFeature))== -1){
                                selectedFeatures.push(JSON.stringify(selFeature));
                                select_source.addFeature(feature);
                                $btnGetPlot.removeClass('disabled');
                            }

                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            console.log(Error);
                        }
                    });
                }


            }
        });

        map.on('pointermove', function(evt) {
            if (evt.dragging) {
                return;
            }
            var pixel = map.getEventPixel(evt.originalEvent);
            var hit = map.forEachLayerAtPixel(pixel, function(layer) {
                if (layer != layers[0] && layer != layers[layers.length - 1] && layer != layers[layers.length - 2] && layer != layers[layers.length - 2]){
                    current_layer = layer;
                    return true;}
            });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        });
    };

    init_slider = function(){

        $("#slider").slider({
            value: 0,
            min: 0,
            max: tLen - 1,
            step: 1,
            animate: "fast",
            slide: function( event, ui ) {
                var tIndex = tLen - ui.value;

                if(tIndex == tLen){
                    tIndex = 0;
                }
                var layer_text = $("#time_table option")[tIndex].text;
                var layer_value = $("#time_table option")[tIndex].value;
                update_wms(layer_value);
            }

        });
    };
    init_all = function(){
        init_jquery_vars();
        init_dropdown();
        gen_color_bar();
        init_map();
        init_events();
    };

    gen_color_bar = function(){
        var scale = [-320,-160,-80,-40,-20,-10,0,10,20,40,80,160,320];
        var colors = ["#f9e79f","#f4d03f","#f5b041","#eb984e","#e57e22","#d5f5e3","#a3e4d7","#85c1e9","#59A4DB","#3498db","#2e86c1","#2471a3","#247196"];
        var cv  = document.getElementById('cv'),
            ctx = cv.getContext('2d');
        ctx.clearRect(0,0,cv.width,cv.height);
        colors.forEach(function(color,i){
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.fillRect(0,i*35,35,45);
            ctx.fillText(scale[i].toFixed(),45,i*35);
        });
    };

    get_styling = function(){

        var start = "red";
        var end = "blue";
        var scale = [-320,-160,-80,-40,-20,-10,0,10,20,40,80,160,320];
        var colors = ["#f9e79f","#f4d03f","#f5b041","#eb984e","#e57e22","#d5f5e3","#a3e4d7","#85c1e9","#59A4DB","#3498db","#2e86c1","#2471a3","#247196"];
        var sld_color_string = '';
        if(scale[scale.length-1] == 0){
            var colors = chroma.scale([start,start]).mode('lab').correctLightness().colors(20);
            gen_color_bar(colors,scale);
            var color_map_entry = '<ColorMapEntry color="'+colors[0]+'" quantity="'+scale[0]+'" label="label1" opacity="0.7"/>';
            sld_color_string += color_map_entry;
        }else{
            var colors = chroma.scale([start,end]).mode('lab').correctLightness().colors(20);
            gen_color_bar(colors,scale);
            colors.forEach(function(color,i){
                var color_map_entry = '<ColorMapEntry color="'+color+'" quantity="'+scale[i]+'" label="label'+i+'" opacity="0.7"/>';
                sld_color_string += color_map_entry;
            });
        }

        return sld_color_string
    };

    add_wms = function(storename){
        // map.removeLayer(wms_layer);
        $("#types").val("None").trigger('change');
        var layer_name = wms_workspace+":"+storename;
        var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>'+layer_name+'</Name><UserStyle><FeatureTypeStyle><Rule>\
            <RasterSymbolizer> \
            <ColorMap> \
            <ColorMapEntry color="#000000" quantity="-999" label="nodata" opacity="0.0" />\
            <ColorMapEntry color="#f9e79f" quantity="-320" label="1" opacity="0.7" />\
            <ColorMapEntry color="#f4d03f" quantity="-160" label="1" opacity="0.7" />\
            <ColorMapEntry color="#f5b041" quantity="-80" label="1" opacity="0.7" />\
            <ColorMapEntry color="#eb984e" quantity="-40" label="1" opacity="0.7" />\
            <ColorMapEntry color="#e57e22" quantity="-20" label="1" opacity="0.7" />\
            <ColorMapEntry color="#d5f5e3" quantity="-10" label="1" opacity="0.7" />\
            <ColorMapEntry color="#a3e4d7" quantity="0" label="1" opacity="0.7" />\
            <ColorMapEntry color="#85c1e9" quantity="10" label="1" opacity="0.7" />\
            <ColorMapEntry color="#59A4DB" quantity="20" label="1" opacity="0.7" />\
            <ColorMapEntry color="#3498db" quantity="40" label="1" opacity="0.7" />\
            <ColorMapEntry color="#2e86c1" quantity="80" label="1" opacity="0.7" />\
            <ColorMapEntry color="#2471a3" quantity="160" label="1" opacity="0.7" />\
            <ColorMapEntry color="#247196" quantity="320" label="1" opacity="0.7" /></ColorMap>\
            </RasterSymbolizer>\
            </Rule>\
            </FeatureTypeStyle>\
            </UserStyle>\
            </NamedLayer>\
            </StyledLayerDescriptor>';

        update_info(storename);

        wms_source.updateParams({'LAYERS':layer_name,'SLD_BODY':sld_string});


    };

    update_wms = function(storename){

        var layer_name = wms_workspace+":"+storename;
        var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>'+layer_name+'</Name><UserStyle><FeatureTypeStyle><Rule>\
            <RasterSymbolizer> \
            <ColorMap> \
            <ColorMapEntry color="#000000" quantity="-999" label="nodata" opacity="0.0" />\
            <ColorMapEntry color="#f9e79f" quantity="-320" label="1" opacity="0.7" />\
            <ColorMapEntry color="#f4d03f" quantity="-160" label="1" opacity="0.7" />\
            <ColorMapEntry color="#f5b041" quantity="-80" label="1" opacity="0.7" />\
            <ColorMapEntry color="#eb984e" quantity="-40" label="1" opacity="0.7" />\
            <ColorMapEntry color="#e57e22" quantity="-20" label="1" opacity="0.7" />\
            <ColorMapEntry color="#d5f5e3" quantity="-10" label="1" opacity="0.7" />\
            <ColorMapEntry color="#a3e4d7" quantity="0" label="1" opacity="0.7" />\
            <ColorMapEntry color="#85c1e9" quantity="10" label="1" opacity="0.7" />\
            <ColorMapEntry color="#59A4DB" quantity="20" label="1" opacity="0.7" />\
            <ColorMapEntry color="#3498db" quantity="40" label="1" opacity="0.7" />\
            <ColorMapEntry color="#2e86c1" quantity="80" label="1" opacity="0.7" />\
            <ColorMapEntry color="#2471a3" quantity="160" label="1" opacity="0.7" />\
            <ColorMapEntry color="#247196" quantity="320" label="1" opacity="0.7" /></ColorMap>\
            </RasterSymbolizer>\
            </Rule>\
            </FeatureTypeStyle>\
            </UserStyle>\
            </NamedLayer>\
            </StyledLayerDescriptor>';
        update_info(storename);
        wms_source.updateParams({'LAYERS':layer_name,'SLD_BODY':sld_string});

    };

    update_info = function(storename){
        var gefsType = $("#f_table option:selected").text();
        var count = 0;
        $('#time_table').find('option').each(function() {
            if($(this).val() == storename){
                date_display = $("#time_table option")[count].text;
            }else{
                count++;
            }
        });
        var day_display = '<b style="color:white;">'+gefsType+': '+ date_display+'</b>';
        document.getElementById('current-day').innerHTML = day_display;
    };

    turn_off_utilsLayers = function(){
        adminOneTileLayer.setVisible(false);
        adminTwoTileLayer.setVisible(false);
        countryTileLayer.setVisible(false);
    };

    upload_file = function(){
        var files = $("#shp-upload-input")[0].files;
        var data;

        $modalUpload.modal('hide');
        data = prepare_files(files);

        $.ajax({
            url: '/apps/gefs/upload-shp/',
            type: 'POST',
            data: data,
            dataType: 'json',
            processData: false,
            contentType: false,
            error: function (status) {

            }, success: function (response) {
                console.log(response);
                map.removeLayer(shp_layer);
                var extents = response.bounds;
                shp_source = new ol.source.Vector({
                    features: (new ol.format.GeoJSON()).readFeatures(response.geo_json)
                });
                shp_layer = new ol.layer.Vector({
                    name:'shp_layer',
                    extent:[extents[0],extents[1],extents[2],extents[3]],
                    source: shp_source,
                    style:new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'blue',
                            lineDash: [4],
                            width: 3
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(0, 0, 255, 0.1)'
                        })
                    })
                });
                map.addLayer(shp_layer);


                map.getView().fit(shp_layer.getExtent(), map.getSize());
                map.updateSize();
                map.render();

                var min = ol.proj.transform([extents[0],extents[1]],'EPSG:3857','EPSG:4326');
                var max = ol.proj.transform([extents[2],extents[3]],'EPSG:3857','EPSG:4326');
                var proj_coords = min.concat(max);
                $("#shp-lat-lon").val(proj_coords);

            }
        });


    };

    $("#btn-add-shp").on('click',upload_file);

    prepare_files = function (files) {
        var data = new FormData();

        Object.keys(files).forEach(function (file) {
            data.append('files', files[file]);
        });

        return data;
    };

    get_ts = function(){
        $('.error').html('');
        var fType = $("#f_table option:selected").val();
        var interaction = $("#types option:selected").val();

        var geom_data;
        if (selectedFeatures.length > 0){
            geom_data = selectedFeatures;
        }else{
            geom_data = $("#poly-lat-lon").val();
        }
        var xhr = ajax_update_database("get-ts",{"fType":fType,"interaction":interaction,"geom_data":geom_data});
        xhr.done(function(result) {
            if("success" in result) {
                $modalChart.modal('show');
                Highcharts.chart('plotter',{
                    chart: {
                        type:'line',
                        zoomType: 'x'
                    },
                    title: {
                        text: $("#f_table option:selected").text()
                    },
                    plotOptions: {
                        series: {
                            marker: {
                                enabled: true
                            },
                            allowPointSelect:true,
                            cursor: 'pointer'
                        }
                    },
                    xAxis: {
                        type: 'datetime',
                        labels: {
                            format: '{value:%d %b %Y}'
                            // rotation: 90,
                            // align: 'left'
                        },
                        title: {
                            text: 'Date'
                        }
                    },
                    // yAxis: {
                    //     title: {
                    //         text: '%'
                    //     },
                    //
                    // },
                    exporting: {
                        enabled: true
                    },
                    series: [{
                        data:result.data["min_data"],
                        name: 'Min Values'
                    },{
                        data:result.data["max_data"],
                        name: 'Max Values'
                    },{
                        data:result.data["median_data"],
                        name: 'Median Values'
                    },{
                        data:result.data["mean_data"],
                        name: 'Mean Values'
                    }]
                });

            } else {
                $(".error").append('<h3>Error Processing Request.</h3>');
            }
        });

    };

    $("#btn-get-plot").on('click',get_ts);

    $(function() {
        $("#btn-cls-upload").on('click',function(){
            $("#types").val("None").trigger("change");
            $modalUpload.modal('hide');
        });
        $('.info-sign').on('click',function(){
           $("#info-modal").modal('show');
        });
    });

    /************************************************************************
     *                        DEFINE PUBLIC INTERFACE
     *************************************************************************/

    public_interface = {

    };

    /************************************************************************
     *                  INITIALIZATION / CONSTRUCTOR
     *************************************************************************/

    // Initialization: jQuery function that gets called when
    // the DOM tree finishes loading
    $(function() {
        init_all();

        $("#f_table").change(function(){
            var fType = $("#f_table option:selected").val();
            $("#time_table").html('');

            var options = gefs_layers[fType];
            options = options.sort(function(a,b){return a[2]<b[2];});
            options.forEach(function(option,i){
                var new_option = new Option(option[0],option[1]);

                if(i==0){
                    $("#time_table").append(new_option).trigger('change');
                }else{
                    $("#time_table").append(new_option);
                }
            });
            animateOptions = options.sort(function(a,b){return a[2]>b[2];});
        }).change();

        $("#time_table").change(function(){
            var layer = $("#time_table option:selected").val();
            add_wms(layer);
        }).change();
        tLen = $("#time_table option").length;
        init_slider();

        $("#slider").on("slidechange", function(event, ui) {
            var tIndex = tLen - ui.value;

            if(tIndex == tLen){
                tIndex = 0;
            }
            var layer_text = $("#time_table option")[tIndex].text;
            var layer_value = $("#time_table option")[tIndex].value;
            update_wms(layer_value);

        });
        // $('#types')[($("#types").find('option:selected').val() == 'None') ? wms_layer.setVisible(true) : wms_layer.setVisible(false)]();


    });

    return public_interface;

}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.