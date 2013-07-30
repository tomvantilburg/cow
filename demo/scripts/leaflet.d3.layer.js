function d3layer(layername, config){
		var f = {}, bounds, feature, collection;
		this.f = f;
		var _this = this;
		var layername = layername;
		this.type = config.type || "path";
		this.freq = 100;
		this.g = config.g;
		this.map = config.map;
		this.style = config.style;
		this.coolcircles = config.coolcircles || false;
		this.labels = config.labels || false;
		this.labelconfig = config.labelconfig;
		this.highlight = config.highlight || false;
		this.scale = config.scale || 'px';
		this.pointradius = config.pointradius || 5;
		this.bounds = [[0,0],[1,1]];
		var width, height,bottomLeft,topRight;
		
		if (config.maptype == 'OpenLayers'){//Getting the correct OpenLayers SVG. 
			var div = d3.selectAll("#" + config.divid);
			div.selectAll("svg").remove();
			var svg = div.append("svg");
		}
		else { //Leaflet does it easier
			/* Initialize the SVG layer */
			this.map.map._initPathRoot()    
			var svg = d3.select("#map").select("svg");
		}
		
		var g = svg.append("g");
		
		// Projecting latlon to screen coordinates
		this.project = function(x) {
		  if (config.maptype == 'Leaflet')
		  	  var point = _this.map.map.latLngToLayerPoint(new L.LatLng(x[1], x[0])); //Leaflet version
		  else if (config.maptype == 'OpenLayers')
		  	  var point = _this.map.getViewPortPxFromLonLat(new OpenLayers.LonLat(x[0],x[1])); //OpenLayers version
		  else {
		  	  console.warn("Error, no correct maptype specified for d3 layer " + layername);
		  	  return;
		  }
		  return [point.x, point.y];
		};
		
		//Set the SVG to the correct dimensions
		this.set_svg = function(){
			var extent = _this.map.getExtent();
			bottomLeft = _this.project([extent.left,extent.bottom]);
			topRight = _this.project([extent.right,extent.top]);
			width = topRight[0] - bottomLeft[0];
			height = bottomLeft[1] - topRight[1];
			svg.attr("width", width)
				.attr("height", height)
				.style("margin-left", bottomLeft[0] + "px")
				.style("margin-top", topRight[1] + "px");
		}
		if (config.maptype == 'OpenLayers')
			this.set_svg();
				
		var path = d3.geo.path().projection(this.project);
		
		this.styling = function(d){ //A per feature styling method
			for (var key in _this.style) { //First check for generic layer style
				d3.select(this).style(key,function(d){
					if (d.style && d.style[key])
						return d.style[key]; //Override with features style if present
 					else	
						return _this.style[key]; //Apply generic style
				});
			};
			//Now apply remaining styles of feature (possible doing a bit double work from previous loop)
			if (d.style) { //If feature has style information
				for (var key in d.style){ //run through the styles
					d3.select(this).style(key,d.style[key]); //and apply them
				}
			}
		};
		
		f.data = function(collection){
			if (config.maptype == 'OpenLayers')
				_this.set_svg();
			
			
			
			if (_this.type == "path"){
				loc = g.selectAll("path")
					.data(collection.features, function(d){
						return d.id;
					});
				f.feature = loc.enter().append("path")
					.attr("d", path)
					.classed("zoomable",true)
					.each(_this.styling)
				
				locUpdate = loc.transition().duration(500)
					.attr("d",path);
				
				loc.exit().remove();
			}
			else if (_this.type == "circle"){
				loc = g.selectAll("circle")
				  .data(collection.features, function(d){return d.id;});
				f.feature = loc.enter().append("circle")
					.attr("cx",function(d) {return _this.project(d.geometry.coordinates)[0]})
					.attr("cy",function(d) { return _this.project(d.geometry.coordinates)[1]})
					.attr("r",10)
					//.attr("class",layername)
					.classed("zoomable",true)
					.each(_this.styling)
				
				//Apply styles
				//for (var key in _this.style) {
				//		f.feature.style(key,_this.style[key]);
				//};
				
				locUpdate = loc
					.transition().duration(100).ease("linear")			
					.attr("cx",function(d) {return _this.project(d.geometry.coordinates)[0]})
					.attr("cy",function(d) { return _this.project(d.geometry.coordinates)[1]})
					;
				loc.exit().remove();
			}
			else if (_this.type == "marker"){
				//Obs? f.collection = this.collection;
				loc = g.selectAll("image")
					.data(collection.features, function(d){return d.id;});
				 
				f.feature = loc.enter().append("image")
				 	.attr("xlink:href", function(d){return d.properties.icon })
				 	.attr("width", 30)
				 	.attr("height", 30)
					.attr("x",function(d) {return _this.project(d.geometry.coordinates)[0]})
					.attr("y",function(d) { return _this.project(d.geometry.coordinates)[1]})
					//.attr("class",layername)
					.classed("zoomable",true)
					.each(_this.styling)
				
				
					
				locUpdate = loc
					.transition().duration(100).ease("linear")			
					.attr("x",function(d) {return _this.project(d.geometry.coordinates)[0]})
					.attr("y",function(d) { return _this.project(d.geometry.coordinates)[1]})
					;
				loc.exit().remove();
			}
			
			if (_this.labels){
				// Append the place labels, setting their initial positions to
				// the feature's centroid
				var placeLabels = g.selectAll('.place-label')
					.data(collection.features, function(d){
						return d.id;
				});
				
					
				var label = placeLabels.enter()
					.append("g")
					.attr('class', 'place-label')
					;
					
				//On new:	
				label
					.append('text')
					.attr("x",function(d) {return _this.project(d.geometry.coordinates)[0] ;})
					.attr("y",function(d) {return _this.project(d.geometry.coordinates)[1] +20;})
					.attr('text-anchor', 'middle')
					.classed('zoomable',true)
					.style('stroke','white')
					.style('stroke-width','3px')
					.style('stroke-opacity',.8)
					.text(function(d) {
							if (_this.labelconfig.field)
								return d.properties[_this.labelconfig.field];
							else
								return d.id; 
					});
				label
					.append('text')
					.attr("x",function(d) {return _this.project(d.geometry.coordinates)[0] ;})
					.attr("y",function(d) {return _this.project(d.geometry.coordinates)[1] +20;})
					.attr('text-anchor', 'middle')
					.classed('zoomable',true)
					.text(function(d) {
							if (_this.labelconfig.field)
								return d.properties[_this.labelconfig.field];
							else
								return d.id; 
					})
					
					//TODO: how about styling the labels?
				//On update:
				//TODO: WHY THIS DOESN"T WORK!??!?
				placeLabels.selectAll('text')
					.attr("x",function(d) {return _this.project(d.geometry.coordinates)[0];})
					.attr("y",function(d) {return _this.project(d.geometry.coordinates)[1] +20;})
					
					
				//On Exit:	
				placeLabels.exit().remove();
			}   
			return f;
        }
		var reset = function() {
			if (config.maptype == 'OpenLayers')
				_this.set_svg();
	
			g.selectAll("image.zoomable")
				.attr("x",function(d) {return _this.project(d.geometry.coordinates)[0];})
				.attr("y",function(d) {return _this.project(d.geometry.coordinates)[1];})
			g.selectAll("circle.zoomable")
				.attr("cx",function(d) {return _this.project(d.geometry.coordinates)[0];})
				.attr("cy",function(d) {return _this.project(d.geometry.coordinates)[1];})
		  	//g.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");
			g.selectAll(".zoomable")
				.attr("d", path);
			g.selectAll("text.zoomable")
				.attr("x",function(d) {return _this.project(d.geometry.coordinates)[0];})
				.attr("y",function(d) {return _this.project(d.geometry.coordinates)[1] +20;})
			  	
		}
		
		core.bind("moveend", reset);
		core.events.bind("locationChange", reset);
		reset();
		return f;
	}
