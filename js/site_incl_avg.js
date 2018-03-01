
//////////////////////
// DEFINE VARIABLES //
//////////////////////
		
var country_code = 'INFORM';
//var admlevel = 2;				
var metric = '';
var metric_label = '';
var metric_year = '';
var metric_source = '';
var metric_desc = '';
var metric_icon = '';
var admlevel_text = '';
var name_selection = '';
var name_selection_prev = '';
var name_popup = '';
var value_popup = 0;
var country_selection = '';
var level2_selection = undefined;
var level3_selection = undefined;
var level2_code = '';
var level3_code = '';
var type_selection = '';
var subtype_selection = ''; 
window.parent_code = '';
var data_input = '';
window.filters = [];
var tables = [];
var x = 500;
var y = 200;
var mapfilters_length = 0;
var d_prev = '';
var map;
var config =  {
	whereFieldName:'pcode',
	joinAttribute:'pcode',
	nameAttribute:'name',
	color:'#0080ff'
};	

///////////////////////////////////
// DEFINE SOME INITIAL FUNCTIONS //
///////////////////////////////////

//Function to start loading spinner
spinner_start = function() {
	var target = document.getElementById('spinner')
	spinner = new Spinner({length: 28, width:14}).spin(target);
}
//Function to stop loading spinner
spinner_stop = function() {
	spinner.stop();
}

//////////////////////////////////////
// FUNCTION TO INITIALIZE DASHBOARD //
//////////////////////////////////////
				
var load_dashboard = function() {
	  
	spinner_start();  
	//Load data
	d = {};
	var inform_indicators = ['INFORM','HA','VU','CC','HA.HUM','HA.NAT','VU.VGR','VU.SEV','CC.INF','CC.INS'];
	
	d3.json("data/inform_full.json", function(inform_data) {
		d.inform_data = $.grep(inform_data.ResultsWFPublished, function(e){ return (inform_indicators.indexOf(e.IndicatorId) > -1 
																|| inform_indicators.indexOf(e.IndicatorId.substring(0,6)) > -1)
																&& e.IndicatorId.split('.').length <= 3
																; });
		
		d3.json("data/inform_metadata.json", function(meta_data) {
			//console.log(meta_data);
			d.Metadata = $.grep(meta_data['Indicators'], function(e){ return (inform_indicators.indexOf(e.OutputIndicatorName) > -1 
																|| inform_indicators.indexOf(e.OutputIndicatorName.substring(0,6)) > -1)
																&& e.OutputIndicatorName.split('.').length <= 3
																; });
			//Geodata
			d3.json("data/worldmap.geojson", function (geo_data) {
				
				//console.log(geo_data);
				d.Districts = geo_data;
				
				d3.dsv(';')("data/worldpopulation.csv", function(pop_data){
					
					d.Rapportage_old = pop_data;
					
					d3.dsv(';')("data/country_metadata.csv", function(country_meta){
						d.Country_meta = country_meta;
						
						//Print data to screen
						console.log(d);
						
						// generate the actual content of the dashboard
						generateCharts(d);
						  
						spinner_stop();
									
						//Check if browser is IE (L_PREFER_CANVAS is a result from an earlier IE-check in layout.server.view.html)	
						if (typeof L_PREFER_CANVAS !== 'undefined') {
							$('#IEmodal').modal('show');
						}
						
					});
				});
			});
		});		
	});
};
load_dashboard();



///////////////////////////////////////////
// MAIN FUNCTION TO GENERATE ALL CONTENT //
///////////////////////////////////////////

var generateCharts = function (d){


	//////////////////////
	// SET UP FUNCTIONS //
	//////////////////////

	// fill the lookup table which finds the community name with the community code
	var genLookup = function (field){
		var lookup = {};
		d.Districts.features.forEach(function(e){
			lookup[e.properties[config.joinAttribute]] = String(e.properties[field]);
		});
		return lookup;
	};
	// fill the lookup table with the metadata-information per variable
	var genLookup_data = function (d,field){
		var lookup_data = {};
		d.Rapportage_old.forEach(function(e){
			lookup_data[e.country_code] = String(e[field]);
		});
		return lookup_data;
	};
	// fill the lookup table with the metadata-information per variable
	var genLookup_meta = function (d,field){
		var lookup_meta = {};
		d.Metadata.forEach(function(e){
			lookup_meta[e.OutputIndicatorName] = String(e[field]);
		});
		return lookup_meta;
	};
	// fill the lookup table with the metadata-information per variable
	var genLookup_country_meta = function (d,field){
		var lookup_country_meta = {};
		d.Country_meta.forEach(function(e){
			lookup_country_meta[e.country_code] = String(e[field]);
		});
		return lookup_country_meta;
	};

	// Clear the charts
	dc.chartRegistry.clear();
	if (map !== undefined) { map.remove(); }
	
	//define dc-charts (the name-tag following the # is how you refer to these charts in html with id-tag)
	var mapChart = dc.leafletChoroplethChart('#map-chart');
	//var rowChart = dc.rowChart('#tab-chart');
	
	//////////////////////////
	// SETUP META VARIABLES //
	//////////////////////////

	//set up country metadata
	var country_name = genLookup_country_meta(d,'country_name');
	var country_level2 = genLookup_country_meta(d,'level2_name');
	var country_default_metric = genLookup_country_meta(d,'default_metric');

	var country_selection = country_name[country_code];
	for (var i=0;i<$('.country_selection').length;i++){ $('.country_selection')[i].innerHTML = country_selection; };
	if (metric === '') { 
		metric = country_default_metric[country_code]; 
	}
	name_selection = country_name[country_code]; 
	for (var i=0;i<$('.name_selection').length;i++){ $('.name_selection')[i].innerHTML = name_selection; };
	
	// get the lookup tables
	var lookup = genLookup(config.nameAttribute);
	
	var meta_label = genLookup_meta(d,'Fullname');
	var meta_scorevar = genLookup_meta(d,'OutputIndicatorName');
	var meta_format = genLookup_meta(d,'format');
	var meta_unit = genLookup_meta(d,'unit');
	var meta_icon = genLookup_meta(d,'icon_src');
	//To fill
	var meta_year = genLookup_meta(d,'year');
	var meta_source = genLookup_meta(d,'source_link');
	var meta_desc = genLookup_meta(d,'description');
	
	metric_label = meta_label[metric];
	for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
	
	type_selection = 'Country';
	subtype_selection = country_level2[country_code]; 
	for (var i=0;i<$('.subtype_selection').length;i++){ $('.subtype_selection')[i].innerHTML = subtype_selection; };
	level2_selection = undefined;
	for (var i=0;i<$('.level2_selection').length;i++){ $('.level2_selection')[i].innerHTML = level2_selection; };
	level3_selection = undefined;
	for (var i=0;i<$('.level3_selection').length;i++){ $('.level3_selection')[i].innerHTML = level3_selection; };
	level2_code = '';
	level3_code = '';
	
	tables = [];
	for (var i=0; i < d.Metadata.length; i++) {
		var record = {};
		var record_temp = d.Metadata[i];
		record.id = 'data-table' + [i+1];
		record.name = record_temp.OutputIndicatorName;
		record.format = 'decimal2';
		record.unit = '';
		record.level = record.name.split(".").length - 1;
		record.group = record_temp.OutputIndicatorName.substring(0,record_temp.OutputIndicatorName.lastIndexOf('.'));
		record.propertyPath = 'value.finalVal';
		record.dimension = undefined;
		record.weight_var = 'population'; //record_temp.weight_var;
		record.scorevar_name = record_temp.OutputIndicatorName; //record_temp.scorevar_name;
		tables[i] = record;
	}
	//console.log(tables);
	
	
	
				
	/////////////////////
	// NUMBER FORMATS ///
	/////////////////////
	
	//Define number formats for absolute numbers and for percentage metrics
	var intFormat = d3.format(',');
	var dec0Format = d3.format(',.0f');
	var dec1Format = d3.format(',.1f');
	var dec2Format = d3.format('.2f');
	var percFormat = d3.format(',.2%');
	
	var currentFormat = function(value) {
		return dec2Format(value);
		// if (meta_format[metric] === 'decimal0') { return dec0Format(value);}
		// else if (meta_format[metric] === 'decimal2') { return dec2Format(value);}
		// else if (meta_format[metric] === 'percentage') { return percFormat(value);}
	};
	
	
	///////////////////////
	// CROSSFILTER SETUP //
	///////////////////////
	
	//First PIVOT the INFORM data from row*indicator level to row level (with indicators als columns)
	var grouped = [];
	d.inform_data.forEach(function (a) {
		// check if title is not in hash table
		if (!this[a.ISO3]) {
			// if not, create new object with title and values array
			// and assign it with the title as hash to the hash table
			this[a.ISO3] = { pcode: a.ISO3, values: [] };
			// add the new object to the result set, too
			grouped.push(this[a.ISO3]);
		}
		// create a new object with the other values and push it
		// to the array of the object of the hash table
		this[a.ISO3].values.push({ IndicatorId: a.IndicatorId, IndicatorScore: a.IndicatorScore });
		//this[a.ISO3].values.push({ [a.IndicatorId]: a.IndicatorScore });
	}, Object.create(null)); // Object.create creates an empty object without prototypes
	var data_final = [];
	for (var i=0; i < grouped.length; i++) {
		var record = {};
		var record_temp = grouped[i];
		record.pcode = record_temp.pcode;
		record.pcode_parent = '';
		record.population = Number(genLookup_data(d,'population')[record_temp.pcode]); //DO BETTER IN FUTURE!!!
		if (isNaN(record.population)){record.population = null;};
		for (var j=0; j < record_temp.values.length; j++) {
			var record_temp2 = record_temp.values[j];
			record[record_temp2.IndicatorId] = String(record_temp2.IndicatorScore);
		}
		data_final[i] = record;
	}
	d.Rapportage = data_final;
	
	// Start crossfilter
	var cf = crossfilter(d.Rapportage);
	
	// The wheredimension returns the unique identifier of the geo area
	var whereDimension = cf.dimension(function(d) { return d.pcode; });
	//var whereDimension_tab = cf.dimension(function(d) { return d.pcode; });
		
	// Create the groups for these two dimensions (i.e. sum the metric)
	var whereGroupSum = whereDimension.group().reduceSum(function(d) {return d[metric];});
	var whereGroupSum_scores = whereDimension.group().reduceSum(function(d) { if (!meta_scorevar[metric]) { return d[metric];} else { return d[meta_scorevar[metric]];};});
		
	// group with all, needed for data-count
	var all = cf.groupAll();
	// get the count of the number of rows in the dataset (total and filtered)
	dc.dataCount('#count-info')
			.dimension(cf)
			.group(all);
		
	// Create customized reduce-functions to be able to calculated percentages over all or multiple districts (i.e. the % of male volunteers))
	var reduceAddAvg = function(metricA,metricB) {
		return function(p,v) {
			p.sumOfSub += v[metricA] ? v[metricA]*v[metricB] : 0;
			p.sumOfTotal += v[metricA] ? v[metricB] : 0;
			p.finalVal = p.sumOfSub / p.sumOfTotal;
			return p;
		};
	};
	var reduceRemoveAvg = function(metricA,metricB) {
		return function(p,v) {
			p.sumOfSub -= v[metricA] ? v[metricA]*v[metricB] : 0;
			p.sumOfTotal -= v[metricA] ? v[metricB] : 0;
			p.finalVal = p.sumOfSub / p.sumOfTotal;
			return p;
		};
	};
	var reduceInitialAvg = function() {
		return {sumOfSub:0, sumOfTotal:0, finalVal:0 };
	}; 
	

	//All data-tables are not split up in dimensions. The metric is always the sum of all selected records. Therefore we create one total-dimension
	var totaalDim = cf.dimension(function(i) { return 'Total'; });
	
	//Create the appropriate crossfilter dimension-group for each element of Tables
	var dimensions = [];
	tables.forEach(function(t) {
		var name = t.name;
		if (t.propertyPath === 'value.finalVal') {
			var weight_var = t.weight_var;
			dimensions[name] = totaalDim.group().reduce(reduceAddAvg([name],[weight_var]),reduceRemoveAvg([name],[weight_var]),reduceInitialAvg);
		} else if (t.propertyPath === 'value') {
			dimensions[name] = totaalDim.group().reduceSum(function(d) {return d[name];});
		}
	});
	// Make a separate one for the filling of the bar charts (based on 0-10 score per indicator)
	var dimensions_scores = [];
	tables.forEach(function(t) {
		var name = t.name;
		if (t.scorevar_name) { 
			var name_score = t.scorevar_name;
			if (t.propertyPath === 'value.finalVal') {
				var weight_var = t.weight_var;
				dimensions_scores[name] = totaalDim.group().reduce(reduceAddAvg([name_score],[weight_var]),reduceRemoveAvg([name_score],[weight_var]),reduceInitialAvg);
			} else if (t.propertyPath === 'value') {
				dimensions_scores[name] = totaalDim.group().reduceSum(function(d) {return d[name_score];});
			}
		}
	});
	//Now attach the dimension to the tables-array		
	var i;
	for (i=0; i < d.Metadata.length; i++) {
		var name = tables[i].name;
		tables[i].dimension = dimensions[name];
	}
	//console.log(tables);
		
	
	///////////////////////////////
	// SET UP ALL INDICATOR HTML //
	///////////////////////////////
	
	//Create table with current crossfilter-selection output, so that you can also access this in other ways than through DC.js
	var fill_keyvalues = function() {
		var keyvalue = [];
		tables.forEach(function(t) {
			var key = t.name;
			if (t.propertyPath === 'value.finalVal') {
				if (isNaN(dimensions[t.name].top(1)[0].value.finalVal)) {
					keyvalue[key] =  'N.A. on this level'; 
				} else if(t.format /*meta_format[t.name]*/ === 'decimal0'){
					keyvalue[key] = dec0Format(dimensions[t.name].top(1)[0].value.finalVal);
				} else if(t.format /*meta_format[t.name]*/ === 'percentage'){
					keyvalue[key] = percFormat(dimensions[t.name].top(1)[0].value.finalVal);
				} else if(t.format /*meta_format[t.name]*/ === 'decimal2'){
					keyvalue[key] = dec2Format(dimensions[t.name].top(1)[0].value.finalVal);
				}
			} else if(t.propertyPath === 'value') {
				if (isNaN(dimensions[t.name].top(1)[0].value)) {
					keyvalue[key] =  'N.A. on this level'; 
				} else if(t.format /*meta_format[t.name]*/ === 'decimal0'){
					keyvalue[key] = dec0Format(dimensions[t.name].top(1)[0].value);
				} else if(t.format /*meta_format[t.name]*/ === 'percentage'){
					keyvalue[key] = percFormat(dimensions[t.name].top(1)[0].value);
				} else if(t.format /*meta_format[t.name]*/ === 'decimal2'){
					keyvalue[key] = dec2Format(dimensions[t.name].top(1)[0].value);
				}
			}
		});
		return keyvalue;
	};
	var keyvalue = fill_keyvalues();
	
	var high_med_low = function(ind,ind_score) {
		
		if (dimensions_scores[ind]) {
			var width = dimensions_scores[ind].top(1)[0].value.finalVal;
			if (isNaN(width)) {return 'notavailable';}
			else if (width < 3.5) { return 'good';} 
			else if (width <= 4.5) {return 'medium-good';}
			else if (width <= 5.5) {return 'medium';}
			else if (width <= 6.5) {return 'medium-bad';}
			else if (width > 6.5) { return 'bad';} 
		}				
	};	
	
	
	var createHTML = function(keyvalue) {
		
		var risk_score = document.getElementById('risk_score_main');
		if (risk_score) {
			risk_score.textContent = keyvalue.INFORM; //risk_score;
			risk_score.setAttribute('class','component-score'); // ' + high_med_low('INFORM','INFORM'));					
		}
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		if (vulnerability_score) {
			vulnerability_score.textContent = keyvalue.VU; //vulnerability_score;
			vulnerability_score.setAttribute('class','component-score'); // ' + high_med_low('VU','VU'));				
		}
		var hazard_score = document.getElementById('hazard_score_main');
		if (hazard_score) {
			hazard_score.textContent = keyvalue.HA; //hazard_score;
			hazard_score.setAttribute('class','component-score'); // ' + high_med_low('HA','HA'));				
		}
		var coping_score = document.getElementById('coping_capacity_score_main');
		if (coping_score) {
			coping_score.textContent = keyvalue.CC; //coping_capacity_score;
			coping_score.setAttribute('class','component-score'); // ' + high_med_low('CC','CC'));				
		}

		
		//Dynamically create HTML-elements for all indicator tables
		var general = document.getElementById('general');
		var INFORM = document.getElementById('INFORM');
		var VU = document.getElementById('VU');
		var HA = document.getElementById('HA');
		var CC = document.getElementById('CC');
		if (general) {while (general.firstChild) { general.removeChild(general.firstChild); };}
		if (INFORM) {while (INFORM.firstChild) { INFORM.removeChild(INFORM.firstChild); };}
		//if (VU) {while (VU.firstChild) { VU.removeChild(VU.firstChild); };}
		//if (HA) {while (HA.firstChild) { HA.removeChild(HA.firstChild); };}
		//if (CC) {while (CC.firstChild) { CC.removeChild(CC.firstChild); };}
		
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (!meta_icon[record.name]) {var icon = 'img/undefined.png';}
			else {icon = 'img/' + record.name.substring(0,2) + '.png';};
			
			if (record.level == 1) {
				
				var width = dimensions_scores[record.name].top(1)[0].value.finalVal*10;
				
				//NEW for INFORM multi-level
				var div_heading = document.createElement('div');
				div_heading.setAttribute('id','heading'+record.name.split('.').join('-'));
				div_heading.setAttribute('class','accordion-header');
				var parent = document.getElementById(record.group)
				parent.appendChild(div_heading);
				var a_prev = document.createElement('a');
				a_prev.setAttribute('data-toggle','collapse');
				a_prev.setAttribute('href','#collapse'+record.name.split('.').join('-'));
				div_heading.appendChild(a_prev);
				var div_collapse = document.createElement('div');
				div_collapse.setAttribute('id','collapse'+record.name.split('.').join('-'));
				div_collapse.setAttribute('class','panel-collapse collapse');
				parent.appendChild(div_collapse);
				//END new part
				var div = document.createElement('div');
				div.setAttribute('class','component-section');
				a_prev.appendChild(div);
				var div0 = document.createElement('div');
				div0.setAttribute('class','col-md-2');
				div.appendChild(div0);	
				var img1 = document.createElement('img');
				img1.setAttribute('style','height:20px');
				img1.setAttribute('src',icon);
				div0.appendChild(img1);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col-md-3 component-label');
				div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				div.appendChild(div1);	
				var div1a = document.createElement('div');
				div1a.setAttribute('class','component-score'); // ' + high_med_low(record.name,record.scorevar_name));
				div1a.setAttribute('id',record.name);
				div1a.innerHTML = keyvalue[record.name];
				div1.appendChild(div1a);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5');
				div.appendChild(div2);
				var div2a = document.createElement('div');
				div2a.setAttribute('class','component-scale');
				div2.appendChild(div2a);
				var div2a1 = document.createElement('div');
				div2a1.setAttribute('class','score-bar ' + high_med_low(record.name,record.scorevar_name));
				div2a1.setAttribute('id','bar-'+record.name);
				div2a1.setAttribute('style','width:'+ width + '%');
				div2a.appendChild(div2a1);
				// var img2 = document.createElement('img');
				// img2.setAttribute('class','scale-icon');
				// img2.setAttribute('src','img/icon-scale.svg');
				// div2a.appendChild(img2);
				var div3 = document.createElement('div');
				div3.setAttribute('class','col-sm-2 col-md-2 no-padding');
				div.appendChild(div3);
				var button = document.createElement('button');
				button.setAttribute('type','button');
				button.setAttribute('class','btn-modal');
				button.setAttribute('data-toggle','modal');
				button.setAttribute('onclick','info(\'' + record.name + '\')');
				div3.appendChild(button);
				var img3 = document.createElement('img');
				img3.setAttribute('src','img/icon-popup.svg');
				img3.setAttribute('style','height:17px');
				button.appendChild(img3);
				
			} 
		}
	};
	createHTML(keyvalue);
	
	var createHTML_level2 = function(keyvalue) {
		
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (!meta_icon[record.name]) {var icon = 'img/undefined.png';}
			else {icon = 'img/' + record.name.substring(0,2) + '.png';};
			
			if (record.level == 2) {
				
				var width = dimensions_scores[record.name].top(1)[0].value.finalVal*10;
								
				var div = document.createElement('div');
				div.setAttribute('class','component-section');
				div.setAttribute('style','background-color:#b0ded3');	//NEW
				var parent = document.getElementById('collapse'+record.group.split('.').join('-')); //UPDATED
				parent.appendChild(div);
				var div0 = document.createElement('div');
				div0.setAttribute('class','col-md-2');
				div.appendChild(div0);	
				var img1 = document.createElement('img');
				img1.setAttribute('style','height:20px');
				img1.setAttribute('src',icon);
				div0.appendChild(img1);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col-md-3 component-label');
				div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				//$compile(div1)($scope);
				div.appendChild(div1);	
				var div1a = document.createElement('div');
				div1a.setAttribute('class','component-score'); // ' + high_med_low(record.name,record.scorevar_name));
				div1a.setAttribute('id',record.name);
				div1a.innerHTML = keyvalue[record.name];
				div1.appendChild(div1a);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5');
				div.appendChild(div2);
				var div2a = document.createElement('div');
				div2a.setAttribute('class','component-scale');
				div2.appendChild(div2a);
				var div2a1 = document.createElement('div');
				div2a1.setAttribute('class','score-bar ' + high_med_low(record.name,record.scorevar_name));
				div2a1.setAttribute('id','bar-'+record.name);
				div2a1.setAttribute('style','width:'+ width + '%');
				div2a.appendChild(div2a1);
				// var img2 = document.createElement('img');
				// img2.setAttribute('class','scale-icon');
				// img2.setAttribute('src','img/icon-scale.svg');
				// div2a.appendChild(img2);
				var div3 = document.createElement('div');
				div3.setAttribute('class','col-sm-2 col-md-2 no-padding');
				div.appendChild(div3);
				var button = document.createElement('button');
				button.setAttribute('type','button');
				button.setAttribute('class','btn-modal');
				button.setAttribute('data-toggle','modal');
				button.setAttribute('onclick','info(\'' + record.name + '\')');
				div3.appendChild(button);
				//$compile(button)($scope);
				var img3 = document.createElement('img');
				img3.setAttribute('src','img/icon-popup.svg');
				img3.setAttribute('style','height:17px');
				button.appendChild(img3);
			}
		}
	}
	createHTML_level2(keyvalue);
	
		
	/////////////////////
	// MAP CHART SETUP //
	/////////////////////
	
	//Define the range of all values for current metric (to be used for quantile coloring)
	//Define the color-quantiles based on this range
	mapchartColors = function() {
		if (!meta_scorevar[metric]){
			var quantile_range = [];
			for (i=0;i<d.Rapportage.length;i++) {
				quantile_range[i] = d.Rapportage[i][metric];
			};
			return d3.scale.quantile()
					.domain(quantile_range)
					.range(['#f1eef6','#bdc9e1','#74a9cf','#2b8cbe','#045a8d']);
		}
	};
	var mapchartColors = mapchartColors();
	
	//Set up the map itself with all its properties
	mapChart
		.width($('#map-chart').width())
		.height(800)
		.dimension(whereDimension)
		.group(whereGroupSum_scores)
		.center([0,0])
		.zoom(0)
		.geojson(d.Districts)				
		.colors(mapchartColors)
		.colorCalculator(function(d){
			if (!meta_scorevar[metric]){
				return d ? mapChart.colors()(d) : '#cccccc';
			} else {
				if (d==0) {return '#cccccc';} 
				else if (d<3.5) {return '#1a9641';} else if (d<=4.5) {return '#a6d96a';} else if (d<=5.5) {return '#f1d121';} else if (d<=6.5) {return '#fd6161';} else if (d>6.5) {return '#d7191c';}
			}
		})
		.featureKeyAccessor(function(feature){
			return feature.properties.pcode;
		})
		.popup(function(d){
			return lookup[d.key].concat(' - ',meta_label[metric],': ',currentFormat(d.value));
		})
		.renderPopup(true)
		.turnOnControls(true)
		//.legend(dc.leafletLegend().position('topleft'))
		//Set up what happens when clicking on the map (popup appearing mainly)
		.on('filtered',function(chart,filters){
			filters = chart.filters();
			var popup = document.getElementById('mapPopup');
			popup.style.visibility = 'hidden';
			document.getElementById('zoomin_icon').style.visibility = 'hidden';
			if (filters.length > mapfilters_length) {
				//$apply(function() {
					name_popup = lookup[filters[filters.length - 1]];
					for (var i=0;i<$('.name_popup').length;i++){ $('.name_popup')[i].innerHTML = name_popup; };
					for (var i=0;i<d.Rapportage.length;i++) {
						var record = d.Rapportage[i];
						if (record.pcode === filters[filters.length - 1]) {
							value_popup = currentFormat(record[metric]); 
							for (var i=0;i<$('.value_popup').length;i++){ $('.value_popup')[i].innerHTML = value_popup; };	
							break;
						};
					}
					metric_label = meta_label[metric];
					for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
				//})
				//In Firefox event is not a global variable >> Not figured out how to fix this, so gave the popup a fixed position in FF only
				if (typeof event !== 'undefined') {
					popup.style.left = event.pageX + 'px';	
					popup.style.top = event.pageY + 'px';
				} else {
					popup.style.left = '400px';	
					popup.style.top = '100px';
				}
				popup.style.visibility = 'visible';
				document.getElementById('zoomin_icon').style.visibility = 'visible';
			} 
			mapfilters_length = filters.length;
			//let reset-button (dis)appear
			var resetbutton = document.getElementsByClassName('reset-button')[0];	
			if (filters.length > 0) {
				resetbutton.style.visibility = 'visible';
			} else {
				resetbutton.style.visibility = 'hidden';
			}
			
		})
	;

		
	///////////////////////////
	// MAP RELATED FUNCTIONS //
	///////////////////////////

	map_coloring = function(id) {

		metric = id;
		metric_label = meta_label[id];
		for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
		mapchartColors = function() {
			if (!meta_scorevar[metric]){
				var quantile_range = [];
				for (i=0;i<d.Rapportage.length;i++) {
					quantile_range[i] = d.Rapportage[i][metric];
				};
				return d3.scale.quantile()
						.domain(quantile_range)
						.range(['#f1eef6','#bdc9e1','#74a9cf','#2b8cbe','#045a8d']);
			};
		};
		var mapchartColors = mapchartColors();
		whereGroupSum_scores.dispose();
		whereGroupSum_scores = whereDimension.group().reduceSum(function(d) { if (!meta_scorevar[metric]) {return d[metric];} else { return d[meta_scorevar[metric]];};});
		mapChart
			.group(whereGroupSum_scores)
			.colors(mapchartColors)
			.colorCalculator(function(d){
				if (!meta_scorevar[metric]){
					return d ? mapChart.colors()(d) : '#cccccc';
				} else {
					if (d==0) {return '#cccccc';} 
					else if (d<3.5) {return '#1a9641';} else if (d<=4.5) {return '#a6d96a';} else if (d<=5.5) {return '#f1d121';} else if (d<=6.5) {return '#fd6161';} else if (d>6.5) {return '#d7191c';}
				}
			})
			;
		//dc.filterAll();
		dc.redrawAll();
		document.getElementById('mapPopup').style.visibility = 'hidden';
		document.getElementById('zoomin_icon').style.visibility = 'hidden';
	};
	
	
	//Make sure that when opening another accordion-panel, the current one collapses	
	var acc = document.getElementsByClassName('accordion-header');
	var panel = document.getElementsByClassName('collapse');
	var active = document.getElementsByClassName('collapse in')[0];
	
	for (var i = 0; i < acc.length; i++) {
		acc[i].onclick = function() {
			var active_new = document.getElementById(this.id.replace('heading','collapse'));
			if (active.id !== active_new.id) {
				active.classList.remove('in');
			} 
			active = active_new;
		}
	}
	
	
	
	/////////////////////
	// OTHER FUNCTIONS //
	/////////////////////		
	
	//Function to open the modal with information on indicator
	info = function(id) {
		metric = id;
		metric_label = meta_label[metric];
		metric_year = meta_year[metric];
		metric_source = meta_source[metric];
		metric_desc = meta_desc[metric];
		for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };
		for (var i=0;i<$('.metric_year').length;i++){ $('.metric_year')[i].innerHTML = metric_year; };
		for (var i=0;i<$('.metric_source').length;i++){ $('.metric_source')[i].innerHTML = metric_source; };
		for (var i=0;i<$('.metric_desc').length;i++){ $('.metric_desc')[i].innerHTML = metric_desc; };
		if (!meta_icon[metric]) {metric_icon = 'img/undefined.png';}
		else {metric_icon = 'img/' + meta_icon[metric];}
		$('#infoModal').modal('show');
	};
	
	//Export to CSV function
	export_csv = function() {
		var content = d.Rapportage;
		for (var i=0;i<content.length;i++){
			content[i].name = lookup[content[i].pcode];
		};

		var finalVal = '';
		
		for (var i = 0; i < content.length; i++) {
			var value = content[i];
			var key,innerValue,result;
			if (i === 0) {
				for (key in value) {
					if (value.hasOwnProperty(key)) {
						innerValue =  key;
						result = innerValue.replace(/"/g, '""');
						if (result.search(/("|,|\n)/g) >= 0)
							result = '"' + result + '"';
						if (key !== 'pcode') finalVal += ';';
						finalVal += result;
					}
				}
			finalVal += '\n';	
			}

			for (key in value) { 
				if (value.hasOwnProperty(key)) {
					innerValue =  JSON.stringify(value[key]);
					result = innerValue.replace(/"/g, '""');
					if (result.search(/("|,|\n)/g) >= 0)
						result = '"' + result + '"';
					if (key !== 'pcode') finalVal += ';';
					finalVal += result;
				}
			}

			finalVal += '\n';
		}
		
		var download = document.getElementById('download');
		download.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(finalVal));
		download.setAttribute('download', 'export.csv');
	};
	
	
	/////////////////////////
	// RENDER MAP AND PAGE //
	/////////////////////////
	
	//Render all dc-charts and -tables
	dc.renderAll(); 
	
	map = mapChart.map();
	function zoomToGeom(geom){
		var bounds = d3.geo.bounds(geom);
		map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
	}
	zoomToGeom(d.Districts);
	
	var zoom_child = $('.leaflet-control-zoom')[0];
	var zoom_parent = $('.leaflet-bottom.leaflet-right')[0];
	zoom_parent.insertBefore(zoom_child,zoom_parent.childNodes[0]);
	
	
	
};

