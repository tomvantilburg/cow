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
		core.bind("sketchcomplete", {widget: self}, self._onSketchComplete);
		
		core.bind("drawExtent", {widget: self},self._drawExtent);
		core.bind("drawPositions", {widget: self},self._drawPositions);
		core.bind("updateSize", {widget: self},function(){
//			self.map.updateSize();
		});
		core.bind("reloadFeatures",{widget: self},self._reloadLayer);
		
		
		element.delegate('.owner','click', function(){
			var key = $(this).attr('owner');
			self.core.featureStores[0].removeItem(key);
			self.core.trigger('storeChanged');
		});
		
		
		//Creating the leaflet map
		this.map = L.map('map',{ 
			zoomControl:false
		})
		.setView([52.083726,5.111282], 9);//Utrecht
		
		// add an OpenStreetMap tile layer
		var osmLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.map);
		
		var baseLayers = {"OSM": osmLayer};
		
		// Initialize the FeatureGroup to store editable layers
		var drawnItems = new L.FeatureGroup();
		this.map.addLayer(drawnItems);
		// Initialize the draw control and pass it the FeatureGroup of editable layers
		this.drawControl = new L.Control.Draw({
			draw: false,
			edit: {
				featureGroup: drawnItems
			}
		});
		
		this.map.addControl(this.drawControl);
		
		L.control.layers(baseLayers).addTo(this.map);
		
		$('#peers').bind("zoomToPeersview", function(evt, bbox){
			self.map.fitBounds([[bbox.bottom,bbox.left],[bbox.top,bbox.right]]);
		});
		
		
		this.handlers = {
			// Triggers the jQuery events, after the map events
			// happened without any further processing
			simple: function(data) {
				var bounds = data.target.getBounds();
				var extent = {
					left: bounds.getWest(),
					bottom: bounds.getSouth(),
					right: bounds.getEast(),
					top: bounds.getNorth()
				};
				self.core.me() && self.core.me().extent(extent); //Set my own extent
				core.trigger(data.type, extent);
			}
        };
		this._createLayers(this.map);
		
				
		this.map.on('moveend',function(e){
				self.handlers.simple(e);
		});
//		this.controls.select.activate();
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
		var features = core.featureStores[0].getAllFeatures();		//TT: we only use 1 store anyway... 
        var element = self.element;
	},
	getExtent: function(){
		var bounds = this.map.getBounds();
		var extent = {
			left: bounds.getWest(),
			bottom: bounds.getSouth(), 
			right: bounds.getEast(),
			top: bounds.getNorth()
		}
		return extent;
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
		self.core.editLayer.clearLayers();
		var items = self.core.getFeaturestoreByName('store1').getAllFeatures();
		$.each(items, function(i, object){
			var feature = object.options.feature;
			if (object.options.status != 'deleted')
				self.core.editLayer.addData(feature)
					.bindLabel(feature.properties.name)
					.setStyle(self.layerstyle);
		});
	},
	
	
	_createLayers: function(map) {
		var self = this;

		self.viewlyr = new d3layer("viewlayer",{
			maptype: "Leaflet",
			map: self,
			type: "path",
			labels: false,
			labelconfig: {
				field: "owner"
			},
			style: {
				fill: "none",
				stroke: "steelBlue",
				'stroke-width': 2
			}
		});

		self.locationlyr = new d3layer("locationlayer",{
			maptype: "Leaflet",
			map: self,
			type: "circle",
			labels: true,
			labelconfig: {
				field:"owner"
			},
			style: {
				fill: "steelBlue"
			}
		});		

		var self = this;
		
	/** Here comes the big bad editlayer.. **/
		this.layerstyle  = function (feature) {
			var icon = L.icon({
					iconUrl: feature.properties.icon,
					iconSize: [40, 40]
			});
			var style = {
				icon: icon,
				color: feature.properties.linecolor,
				fillColor:  feature.properties.polycolor
			} 
			return style;
		};
		function highlightFeature(e) {
			var layer = e.target;
			
			layer.setStyle({
				weight: 5,
				color: '#666',
				dashArray: '',
				fillOpacity: 0.7
			});
		
			if (!L.Browser.ie && !L.Browser.opera) {
				layer.bringToFront();
			}
		}
		function resetHighlight(e) {
			self.editLayer.resetStyle(e.target);
		}
		function zoomToFeature(e) {
			self.map.fitBounds(e.target.getBounds());
		}
		function openPopup(e) {
			var feature = e.target.feature;
			var layer = e.layer;
			var name = feature.properties.name || "";
			var desc = feature.properties.desc || "";
			var innerHtml = ''
					+ 'Label: <input id="titlefld" name="name" value ="'+name+'""><br/>'
					+ 'Description: <br> <textarea id="descfld" name="desc" rows="4" cols="25">'+desc+'</textarea><br/>'
					+ '<button class="popupbutton" id="editButton">edit</button><br />'
					+ '<button class="popupbutton" id="deleteButton"">delete</button><br />'
					+ '<button class="popupbutton" id="closeButton"">Done</button>';
			var popup = L.popup()
				.setLatLng(e.latlng)
				.setContent(innerHtml)
				.openOn(self.map);
			tmp = e;
			var titlefld = document.getElementById('titlefld');
			titlefld.addEventListener("blur", self.changeFeature, false);
			var descfld = document.getElementById('descfld');
			descfld.addEventListener("blur", self.changeFeature, false);
			var editbtn = document.getElementById('editButton');
			editbtn.addEventListener("touchstart", self.editfeature, false);
			editbtn.addEventListener("click", self.editfeature, false);
			var deletebtn = document.getElementById('deleteButton');
			deletebtn.addEventListener("touchstart", function() {
				self.deletefeature(self,feature, layer);
			}, false);
			deletebtn.addEventListener("click", function() {
				console.log(feature);
				self.deletefeature(self,feature,layer);
			}, false);
			var closebtn = document.getElementById('closeButton');
			closebtn.addEventListener("touchstart", function(){self.closepopup(self);}, false);
			closebtn.addEventListener("click", function(){self.closepopup(self);}, false);
		}
		function onEachFeature(feature, layer) {
			layer.on({
				mouseover: highlightFeature,
				mouseout: resetHighlight,
				click: openPopup
			});
		}
		
		var editlayer = L.geoJson(null,{
				style: this.layerstyle,
				onEachFeature: onEachFeature,
				pointToLayer: function (feature, latlng) {
					return L.marker(latlng, {
							icon: L.icon({
									iconUrl: feature.properties.icon,
									iconSize: [40, 40]
							})
					})
					.bindLabel(feature.properties.name);
				}
		}
		).addTo(map);
		
		
		//See following URL for custom draw controls in leaflet
		//http://stackoverflow.com/questions/15775103/leaflet-draw-mapping-how-to-initiate-the-draw-function-without-toolbar
		
		this.controls = {
//			modify: new OpenLayers.Control.ModifyFeature(editlayer),
			//add: new OpenLayers.Control.EditingToolbar(editlayer),
//			select: new OpenLayers.Control.SelectFeature(editlayer),
			pointcontrol: new L.Draw.Marker(this.map, this.drawControl.options.Marker),
			linecontrol: new L.Draw.Polyline(this.map, this.drawControl.options.polyline),  
			polycontrol:  new L.Draw.Polygon(this.map, this.drawControl.options.polygon),
			//deletecontrol: new L.EditToolbar.Delete(this.map, {
            //    featureGroup: drawControl.options.featureGroup
            //})
		}                 

        
		$('#newfeatpanel').bind("newpoint", function(evt, key){
			self.controls.linecontrol.disable();
			self.controls.polycontrol.disable();
			self.controls.pointcontrol.enable();
			var Licon = L.icon({
					iconUrl: key,
					iconSize: [40, 40]
			});
			self.controls.pointcontrol.setOptions({icon: Licon});
			var layer = self.editLayer;
			core.current_icon = key;
		});
		$('#newfeatpanel').bind("newline", function(evt, key){
			self.controls.pointcontrol.disable();
			self.controls.polycontrol.disable();
			self.controls.linecontrol.enable();
			var layer = self.editLayer;
			core.current_linecolor = key;
		});
		$('#newfeatpanel').bind("newpoly", function(evt, key){
			self.controls.linecontrol.disable();
			self.controls.pointcontrol.disable();
			self.controls.polycontrol.enable();
			var layer = self.editLayer;
			core.current_linecolor = key;
        	core.current_polycolor = key;
		});
		
		
		this.editLayer = editlayer;
		core.editLayer = editlayer;
		/*this.editLayer.events.on({
			scope: this,
			sketchcomplete: this.handlers.includeFeature//this.handlers.simple		
		})*/;		

		this.map.on('draw:created', function (e) {
			var type = e.layerType,
				layer = e.layer;
			self.core.trigger('sketchcomplete',layer.toGeoJSON());
		});
		
		

//		this.editLayer.events.register('afterfeaturemodified',{'self':this,layer:editlayer},function(evt){core.trigger('afterfeaturemodified',evt.feature)});
		//this.editLayer.events.on({'featureselected': function(){
		//		alert('Feat selected');
		//}});
//		this.controls.select.activate();
		/** End of the big bad editlayer **/
	},
	_onSketchComplete: function(evt, feature){
		var core = evt.data.widget.core;
		//Disable the draw control(s) after drawing a feature
/*		var controls = evt.data.widget.map.getControlsByClass('OpenLayers.Control.DrawFeature');
		$.each(controls,function(id,control){
				control.deactivate();
		});
*/	},
	
	editfeature: function(evt,x){
/*		var feature = core.editLayer.selectedFeatures[0];
		feature.popup.hide();
		//TODO: WHY can't I reach the controls of my own class?!
		var controls = $('#map').OlMapWidget('getControls')
		controls.modify.mode = OpenLayers.Control.ModifyFeature.RESHAPE;
		controls.modify.standalone = true;
		controls.modify.activate();
		controls.modify.selectFeature(feature);
*/	},
	deletefeature: function(self,feature, layer){
		//var feature = item.target.feature; 
		var key = feature.properties.key;
		var store = feature.properties.store || "store1";
		core.getFeaturestoreByName(store).removeItem(key);
		self.map.closePopup();
		console.log('storeChanged');
		core.trigger('storeChanged');
	},
	changeFeature: function(evt){
/*		var key = evt.currentTarget.name;
		var value = evt.currentTarget.value;
		var feature = core.editLayer.selectedFeatures[0];
		if (feature){
			var store = feature.attributes.store || "store1";
			 
			if (key == "name")
				feature.attributes.name = value;
			if (key == "desc")
				feature.attributes.desc = value;
			feature.popup.destroy(); //we have to destroy since the next line triggers a reload of all features
			core.getFeaturestoreByName(store).updateLocalFeat(feature);
		}
*/	},
	closepopup: function(self){
		self.map.closePopup();
	}
	
	
	});
})(jQuery);


