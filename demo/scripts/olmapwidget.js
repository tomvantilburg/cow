/*$.Cow.ConnectWidget = {
init: function(){
var widget = $('#connect');
var cow = $('#cow').data('cow');
cow.events.bind('connected',{}, this._onConnect);
},
_onConnect: function() {
}
}
*/


/**
	TT: copied from featureswidget.js and adapted for map purpose
**/



(function($) {

var _defaultOptions = {
        bbox: [-180, -85, 180, 85],
        bboxMax: [-180, -85, 180, 85],
        center: [0, 0],
        // The cow.core instance
        core: undefined
};

$.widget("cow.OlMapWidget", {
	options: $.extend({}, _defaultOptions),
	
 	_create: function() {
        var core;
        var self = this;		
        var element = this.element;
        
        core = $(this.options.core).data('cow');
		this.core=core;
        core.bind("dbloaded", {widget: self}, self._onLoaded);
		core.bind("storeChanged", {widget: self}, self._onLoaded);
		
		core.bind("drawExtent", {widget: self},self._drawExtent);
		core.bind("drawPositions", {widget: self},self._drawPositions);
		core.bind("updateSize", {widget: self},function(){
			self.map.updateSize();
		});
		
		
		element.delegate('.owner','click', function(){
			var key = $(this).attr('owner');
			self.core.featureStores[0].removeItem(key);
			self.core.trigger('storeChanged');
		});
		
		//openlayers stuff
		this.map = new OpenLayers.Map("map");
		var osmlayer = new OpenLayers.Layer.OSM("OpenStreetMap", null, {
		   transitionEffect: 'resize'
		});
		
		//this.map.addLayer(layer = new OpenLayers.Layer.Stamen("toner-lite", {opacity:0.5}));
		this.map.addLayer(osmlayer);
		//this.map.setCenter(new OpenLayers.LonLat(768708,6849389), 10);//Enschede
		this.map.setCenter(new OpenLayers.LonLat(546467,6862526),10);//Amsterdam
		this.map.addControl(new OpenLayers.Control.LayerSwitcher());
		
		$('#peers').bind("zoomToPeersview", function(evt, bbox){
				var lb = new OpenLayers.LonLat(bbox.left,bbox.bottom);
				var rt = new OpenLayers.LonLat(bbox.right,bbox.top);
				var fromproj = new OpenLayers.Projection("EPSG:4326");
				var toproj = new OpenLayers.Projection("EPSG:900913");
				lb.transform(fromproj, toproj);
				rt.transform(fromproj, toproj);
				self.map.zoomToExtent([lb.lon,lb.lat,rt.lon,rt.lat]);
		});
		
		
		this.handlers = {
			// Triggers the jQuery events, after the OpenLayers events
			// happened without any further processing
			simple: function(data) {
				var extent = data.object.getExtent().toGeometry();
				var toproj = new OpenLayers.Projection("EPSG:4326");
				var fromproj = new OpenLayers.Projection("EPSG:900913");
				extent.transform(fromproj, toproj);
				extent.getBounds();
				self.core.me() && self.core.me().extent(extent.bounds); //Set my own extent
				core.trigger(data.type, extent.bounds);
			}
        };
		this._createLayers(this.map);
		
				
		this.map.events.on({
			scope: this,
			moveend: this.handlers.simple		
		});
		this.controls.select.activate();
    },
    _destroy: function() {
        this.element.removeClass('ui-dialog ui-widget ui-widget-content ' +
                                 'ui-corner-all')
            .empty();
    },
	_onLoaded: function(evt) {
		//console.log('_onLoaded');
		var self = evt.data.widget;
		self._updateMap(evt);
	},
	_onNewFeature: function(evt) {
		//console.log('_onNewFeature');
		var self = evt.data.widget;
		self._updateMap(evt);
	},
	_updateMap: function(evt) {		
		var self = evt.data.widget;
		self._reloadLayer(); 
        
	},
	getExtent: function(){
		return this.map.getExtent().toBBOX();
	},
	getControls: function(){
		return this.controls;
	},
	
	_drawExtent: function(evt, peerCollection) {
		var self = evt.data.widget;
		if (self.viewlyr)
			self.viewlyr.data(peerCollection);
	},
	_drawPositions: function(evt, collection) {
		var self = evt.data.widget;
		//apply some styling to collection
		$.each(collection.features, function(i,d){
			var style = {}; //TODO: this goes right on Chrome desktop but wrong on chrome Beta mobile?!
			if (d.id == self.core.me().uid)
				style.fill = "red";
			else style.fill = "steelBlue";
			d.style = style;
		});
			
		if (self.locationlyr)
			self.locationlyr.data(collection);
	},
	
	
	_reloadLayer: function(e){
		console.log('MW _reloadLayer');
		self.core.editLayer.removeAllFeatures();
		var items = self.core.getFeaturestoreByName('store1').getAllFeatures();
		$.each(items, function(i, object){
			var feature = geojson_format.read(object.options.feature,"Feature");
			feature.properties = {};
			$.each(feature.attributes, function(i,d){
				feature.properties[i] = d;
			})
			
			if (object.options.status != 'deleted')
				self.core.editLayer.addFeatures(feature);
		});
	},
	
	_createLayers: function(map) {
		var self = this;
		var myd3layer = new OpenLayers.Layer.Vector('Extents layer');
		// Add the container when the overlay is added to the map.
		myd3layer.afterAdd = function () {
			var divid = myd3layer.div.id;
			self.viewlyr = new d3layer("viewlayer",{
				maptype: "OpenLayers",
				divid:divid,
				map: self.map,
				type: "path",
				labels: true,
				labelconfig: {
					field: "owner"
				},
				style: {
					fill: "none",
					stroke: "steelBlue",
					'stroke-width': 2
				}
			});
		};
		map.addLayer(myd3layer);
		self.core.viewlyr = self.viewlyr;//FOR DEBUG
		
		var myLocationLayer = new OpenLayers.Layer.Vector('d3layer');
		myLocationLayer.afterAdd = function () {
			var divid = myLocationLayer.div.id;
			self.locationlyr = new d3layer("locationlayer",{
				maptype: "OpenLayers",
				divid:divid,
				map: self.map,
				type: "circle",
				labels: true,
				labelconfig: {
					field:"owner"
				},
				style: {
					fill: "steelBlue"
				}
			});
		};
		map.addLayer(myLocationLayer);
		

		var self = this;
		
	/** Here comes the big bad editlayer.. **/
		var context = {
			getStrokeWidth: function(feature) {
				if (feature.layer && feature.layer.map.getZoom() > 15)
					return 3;
				return 1;
			},
			getLabel: function(feature) {
				if (feature.properties && feature.properties.name && feature.layer.map.getZoom() > 13)
                    return feature.properties.name;
                return "";
			},
            getIcon: function(feature) {
            	if (feature.properties && feature.properties.icon && feature.properties.icon != null){
            		//addition for larger scale icons IMOOV
            		str = feature.properties.icon;
            		var patt=new RegExp("imoov");
            		if (str && feature.layer && feature.layer.map.zoom < 15 && patt.test(str))
            		{
            			return str.replace(/-g.png/g,'k.png');
            		}
                    return feature.properties.icon;
                }
                return "./mapicons/notvisited.png";
            },
            getLineColor: function(feature){
            	if (feature.properties && feature.properties.linecolor)
            		return feature.properties.linecolor;
            	return "black";
            },
            getPolyColor: function(feature){
            	if (feature.properties && feature.properties.polycolor)
            		return feature.properties.polycolor;
            	return null;
            },
            getFillOpacity: function(feature){
            	if (feature.geometry && feature.geometry.CLASS_NAME == 'OpenLayers.Geometry.Polygon')
            		return 0.5;
            	return 1;
            },
            getZindex: function(feature){
            	if (feature.geometry && feature.geometry.CLASS_NAME == 'OpenLayers.Geometry.Polygon')
            		return 0;
            	if (feature.geometry && feature.geometry.CLASS_NAME == 'OpenLayers.Geometry.LineString')
            		return 10;
            	return 20;
            }
        };
        
		var template = {
		  pointRadius: 20,
		  strokeWidth: "${getStrokeWidth}",
		  label: "${getLabel}",
		  title: "${getLabel}",
		  labelAlign: "tl",
		  labelXOffset: "15",
          labelYOffset: "0",
		  fontColor: '#00397C',
		  fontSize: '12pt',
		  labelOutlineColor: "white", 
          labelOutlineWidth: 1,
		  graphicZIndex: "${getZindex}",
		  fillOpacity: "${getFillOpacity}",
		  externalGraphic: "${getIcon}",
		  fillColor: "${getPolyColor}",
		  strokeColor: "${getLineColor}"
        };
        var selecttemplate = {
          pointRadius: 40,
		  strokeWidth:6,
		  graphicZIndex: "${getZindex}",
		  fillOpacity: "${getFillOpacity}",
		  externalGraphic: "${getIcon}",
		  fillColor: "${getPolyColor}",
		  strokeColor: "${getLineColor}"
        };
		var style = new OpenLayers.Style(template,{
        		context: context
        });
        var selectstyle = new OpenLayers.Style(selecttemplate,{
        		context: context
        }); 

		
		var editLayerStylemap = new OpenLayers.StyleMap({
			default:style,
			select: selectstyle 
		});
		var editlayer = new OpenLayers.Layer.Vector('Features layer',{
			
			styleMap:editLayerStylemap,
			// add a special openlayers renderer extension that deals better with markers on touch devices
			renderers: ["SVG"],
			// enable the indexer by setting zIndexing to true
			rendererOptions: {zIndexing: true},
			eventListeners:{
				featureselected:function(evt){
					//TODO TT: This whole system of creating a popup is ugly!
					//create something nicer...
					var feature = evt.feature;
					var name = feature.properties.name || "";
					var desc = feature.properties.desc || "";
					var innerHtml = ''
						//+'<input onBlur="">Title<br>'
						//+'<textarea></textarea><br>'
						+ 'You can remove or change this feature using the buttons below<br/>'
						+ 'Label: <input id="titlefld" name="name" value ="'+name+'""><br/>'
						+ 'Description: <br> <textarea id="descfld" name="desc" rows="4" cols="25">'+desc+'</textarea><br/>'
						+ '<button class="popupbutton" id="editButton">edit</button><br>'
						+ '<button class="popupbutton" id="deleteButton"">delete</button>'
						+ '<button class="popupbutton" id="closeButton"">Done</button>';
					var anchor = {'size': new OpenLayers.Size(0,0), 'offset': new OpenLayers.Pixel(100, -100)};
					var popup = new OpenLayers.Popup.Anchored("popup",
						OpenLayers.LonLat.fromString(feature.geometry.getCentroid().toShortString()),
						null,
						innerHtml,
						anchor,
						true,
						null
					);
					popup.autoSize = true;
					popup.maxSize = new OpenLayers.Size(800,1000);
					popup.relativePosition = "br";
					popup.fixedRelativePosition = true;
					feature.popup = popup;
					map.addPopup(popup);
					//var titlefld = document.getElementById('titlefld');
					//titlefld.addEventListener("blur", self.changeFeature, false);
					//var descfld = document.getElementById('descfld');
					//descfld.addEventListener("blur", self.changeFeature, false);
					var editbtn = document.getElementById('editButton');
					editbtn.addEventListener("touchstart",self.editfeature, false);
					editbtn.addEventListener("click",self.editfeature, false);
					var deletebtn = document.getElementById('deleteButton');
					deletebtn.addEventListener("touchstart", self.deletefeature, false);
					deletebtn.addEventListener("click", self.deletefeature, false);
					var closebtn = document.getElementById('closeButton');
					closebtn.addEventListener("touchstart", self.savefeature, false);
					closebtn.addEventListener("click", self.savefeature, false);
				},
				featureunselected:function(evt){
					console.log('MW featureunselected');
					if (evt.feature.popup){
						self.map.removePopup(evt.feature.popup);
					}
					
				}
		}});
		
		
		this.controls = {
			modify: new OpenLayers.Control.ModifyFeature(editlayer),
			//add: new OpenLayers.Control.EditingToolbar(editlayer),
			select: new OpenLayers.Control.SelectFeature(editlayer),
			pointcontrol: new OpenLayers.Control.DrawFeature(editlayer,OpenLayers.Handler.Point),
			linecontrol:  new OpenLayers.Control.DrawFeature(editlayer, OpenLayers.Handler.Path),
			polycontrol:  new OpenLayers.Control.DrawFeature(editlayer, OpenLayers.Handler.Polygon)
		}
		
		for(var key in this.controls) {
                this.map.addControl(this.controls[key]);
        }
        
		$('#newfeatpanel').bind("newpoint", function(evt, key){
			self.controls.linecontrol.deactivate();
			self.controls.polycontrol.deactivate();
			self.controls.pointcontrol.activate();
			var layer = self.editLayer;
			core.current_icon = key;
		});
		$('#newfeatpanel').bind("newline", function(evt, key){
			self.controls.pointcontrol.deactivate();
			self.controls.polycontrol.deactivate();
			self.controls.linecontrol.activate();
			var layer = self.editLayer;
			core.current_linecolor = key;
		});
		$('#newfeatpanel').bind("newpoly", function(evt, key){
			self.controls.linecontrol.deactivate();
			self.controls.pointcontrol.deactivate();
			self.controls.polycontrol.activate();
			var layer = self.editLayer;
			core.current_linecolor = key;
        	core.current_polycolor = key;
		});
		
		this.map.addLayer(editlayer);
		this.editLayer = editlayer;
		core.editLayer = editlayer;
		/*this.editLayer.events.on({
			scope: this,
			sketchcomplete: this.handlers.includeFeature//this.handlers.simple		
		})*/;		
		this.editLayer.events.register('sketchcomplete',
			{'self':this,layer:editlayer},
			function(evt){
				//Disable the draw control(s) after drawing a feature
				$.each(self.controls,function(id,control){
						control.deactivate();
				});
				self.controls.select.activate();
				
				var feature = JSON.parse(geojson_format.write(evt.feature));
				core.trigger('sketchcomplete',feature);
				evt.feature.destroy(); //Ridiculous.... without this the 'edited' feature stays on the map
			}
		);
		this.editLayer.events.register('afterfeaturemodified',
			{'self':this,layer:editlayer},
			function(evt){
				var feature = JSON.parse(geojson_format.write(evt.feature));
				core.trigger('afterfeaturemodified',feature);
			}
		);
		this.controls.select.activate();
		/** End of the big bad editlayer **/
	},
	
		
	
	
	editfeature: function(evt,x){ //First set the text and then go to edit mode without writing to store first
		var feature = core.editLayer.selectedFeatures[0];
		feature.attributes.name = document.getElementById('titlefld').value; //TODO. Yuck, yuck yuck....
		feature.attributes.desc = document.getElementById('descfld').value;
		if (feature.popup) 
			feature.popup.destroy();
		var controls = $('#map').OlMapWidget('getControls');//TODO: give self along with event so we can reach controls
		controls.modify.mode = OpenLayers.Control.ModifyFeature.RESHAPE;
		controls.modify.standalone = true;
		controls.modify.activate();
		controls.modify.selectFeature(feature);
	},
	deletefeature: function(){
		var feature = core.editLayer.selectedFeatures[0];
		if (feature.popup)
			feature.popup.destroy();
		var key = feature.properties.key;
		var store = feature.properties.store || "store1";
		core.getFeaturestoreByName(store).removeItem(key);
		core.trigger('storeChanged');
	},
	savefeature: function(evt){ //Just save the text...
		var feature = core.editLayer.selectedFeatures[0];
		feature.attributes.name = document.getElementById('titlefld').value; //TODO. Yuck, yuck yuck....
		feature.attributes.desc = document.getElementById('descfld').value;
		if (feature.popup){
			//core.map.removePopup(feature.popup);
			feature.popup.destroy(); //we have to destroy since the next line triggers a reload of all features
			feature.popup = null;
		}
		var jsonfeature = JSON.parse(geojson_format.write(feature));
		var store = feature.properties.store || "store1";
		core.getFeaturestoreByName(store).updateLocalFeat(jsonfeature);
	},
	
	
	
		
		
	
	
	
	});
})(jQuery);

