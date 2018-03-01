
//////////////////////
// DEFINE VARIABLES //
//////////////////////
		
//var country_code = '';
var inform_model = 'INFORM2017';
var inform_levels = 4;				
var metric = 'INFORM';
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
var colorDomain = {
	INFORM: ['#FFC8BF','#FE9181','#FE5A3C','#951301','#620D01'],
	HA: ['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'],
	VU: ['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'],
	CC: ['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026']
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
				
load_dashboard = function(inform_model) {
	  
	spinner_start();  
	
	if (inform_model == 'INFORM2017') { country_code = ''; } else { country_code = inform_model.replace('INFORM',''); };
		
	//Load data
	var workflow = 'http://www.inform-index.org/API/InformAPI/workflows/GetByWorkflowGroup/';
	
	//Empty data-object
	d = {};
	//d3.json(workflow + inform_model, function(data){
	d3.json('data/workflow' + country_code + '.json', function(data) {	
		//Determine workflowId
		var workflow_id = data[0].WorkflowId;
	
		//Get links for data and metadata
		var url_meta = 'http://www.inform-index.org/API/InformAPI/Processes/GetByWorkflowId/' + workflow_id;
		
		// Load INFORM metadata
		//d3.json(url_meta, function(meta_data) {
		d3.json('data/metadata' + country_code + '.json', function(meta_data) {
			//console.log(meta_data);
			d.Metadata = $.grep(meta_data, function(e){ return e.VisibilityLevel <= 99 && e.VisibilityLevel <= inform_levels; });
			inform_indicators = d.Metadata.map(a => a.OutputIndicatorName);
			
			//API-link with all needed indicators
			var url_data = 'http://www.inform-index.org/API/InformAPI/countries/Scores/?WorkflowId=' + workflow_id + '&IndicatorId=' + inform_indicators.toString();
						
			//Load INFORM data
			//d3.json(url_data, function(inform_data){
			d3.json('data/inform_data' + country_code + '.json', function(inform_data) {
				//console.log(inform_data);
				d.inform_data = inform_data; //$.grep(inform_data, function(e){ return inform_indicators.indexOf(e.IndicatorId) > -1;});// e.IndicatorId.split('.').length <= inform_levels; });
				
				//Load Geodata
				if (inform_model == 'INFORM2017') { geo_data_url = 'countries'; } else { geo_data_url = inform_model.replace('INFORM','countries');	};
				d3.json('data/' + geo_data_url + '.json', function (geo_data) {
					//console.log(geo_data);
					d.Districts = topojson.feature(geo_data,geo_data.objects[geo_data_url]);
					d.Districts.features = $.grep(d.Districts.features,function(e){ return ['ATA','GRL'].indexOf(e.id) <= -1 ;});
					
					//Load color-data (TO DO: to be replaced by API-call)
					d3.dsv(';')("data/colors.csv", function(color_data){
						d.Colors = color_data;
						
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
load_dashboard(inform_model);



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
			lookup[e.id] = String(e.properties[field]);
		});
		return lookup;
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
	// var genLookup_country_meta = function (d,field){
		// var lookup_country_meta = {};
		// d.Country_meta.forEach(function(e){
			// lookup_country_meta[e.country_code] = String(e[field]);
		// });
		// return lookup_country_meta;
	// };

	
	
	//////////////////////////
	// SETUP META VARIABLES //
	//////////////////////////

	//set up country metadata
	//var country_name = genLookup_country_meta(d,'country_name');
	//var country_level2 = genLookup_country_meta(d,'level2_name');
	//var country_default_metric = genLookup_country_meta(d,'default_metric');

	//var country_selection = country_name[country_code];
	//for (var i=0;i<$('.country_selection').length;i++){ $('.country_selection')[i].innerHTML = country_selection; };
	//if (metric === '') { 
		//metric = country_default_metric[country_code]; 
	//}
	//name_selection = country_name[country_code]; 
	//for (var i=0;i<$('.name_selection').length;i++){ $('.name_selection')[i].innerHTML = name_selection; };
	
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
	
	//type_selection = 'Country';
	//subtype_selection = country_level2[country_code]; 
	//for (var i=0;i<$('.subtype_selection').length;i++){ $('.subtype_selection')[i].innerHTML = subtype_selection; };
	//level2_selection = undefined;
	//for (var i=0;i<$('.level2_selection').length;i++){ $('.level2_selection')[i].innerHTML = level2_selection; };
	//level3_selection = undefined;
	//for (var i=0;i<$('.level3_selection').length;i++){ $('.level3_selection')[i].innerHTML = level3_selection; };
	//level2_code = '';
	//level3_code = '';
	
	tables = [];
	for (var i=0; i < d.Metadata.length; i++) {
		var record = {};
		var record_temp = d.Metadata[i];
		record.id = 'data-table' + [i+1];
		record.name = record_temp.OutputIndicatorName;
		record.format = 'decimal1';
		record.unit = '';
		record.level = record_temp.VisibilityLevel-1; //record.name.split(".").length - 1;
		record.group = record_temp.Parent == 'HA.NAT-TEMP' ? 'HA.NAT' : record_temp.Parent; //record_temp.OutputIndicatorName.substring(0,record_temp.OutputIndicatorName.lastIndexOf('.'));
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
		return dec1Format(value);
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
		if (!this[a.Iso3]) {
			// if not, create new object with title and values array
			// and assign it with the title as hash to the hash table
			this[a.Iso3] = { pcode: a.Iso3, values: [] };
			// add the new object to the result set, too
			grouped.push(this[a.Iso3]);
		}
		// create a new object with the other values and push it
		// to the array of the object of the hash table
		this[a.Iso3].values.push({ IndicatorId: a.IndicatorId, IndicatorScore: a.IndicatorScore });
		//this[a.Iso3].values.push({ [a.IndicatorId]: a.IndicatorScore });
	}, Object.create(null)); // Object.create creates an empty object without prototypes
	var data_final = [];
	for (var i=0; i < grouped.length; i++) {
		var record = {};
		var record_temp = grouped[i];
		record.pcode = record_temp.pcode;
		record.pcode_parent = '';
		for (var j=0; j < record_temp.values.length; j++) {
			var record_temp2 = record_temp.values[j];
			record[record_temp2.IndicatorId] = String(record_temp2.IndicatorScore);
		}
		data_final[i] = record;
	}
	
	// Start crossfilter
	var cf = crossfilter(data_final);
	for (var i=0;i<$('.total-count').length;i++){ $('.total-count')[i].innerHTML = data_final.length; };	
	for (var i=0;i<$('.filter-count').length;i++){ $('.filter-count')[i].innerHTML = data_final.length; };	
	
	// The wheredimension returns the unique identifier of the geo area
	var whereDimension = cf.dimension(function(d) { return d.pcode; });
	var whereDimension_tab = cf.dimension(function(d) { return d.pcode; });
		
	// Create the groups for these two dimensions (i.e. sum the metric)
	var whereGroupSum = whereDimension.group().reduceSum(function(d) {return d[metric];});
	var whereGroupSum_scores = whereDimension.group().reduceSum(function(d) { if (!meta_scorevar[metric]) { return d[metric];} else { return d[meta_scorevar[metric]];};});
	var whereGroupSum_tab_scores = whereDimension_tab.group().reduceSum(function(d) { if (!meta_scorevar[metric]) { return d[metric];} else { return d[meta_scorevar[metric]];};});
		
	// group with all, needed for data-count
	var all = cf.groupAll();
	// get the count of the number of rows in the dataset (total and filtered)
	dc.dataCount('#count-info')
		.dimension(cf)
		.group(all);
		
	// Create customized reduce-functions to be able to calculated percentages over all or multiple districts (i.e. the % of male volunteers))
	var reduceAddAvg = function(metricA) {
		return function(p,v) {
			p.sumOfSub += v[metricA] ? v[metricA]*1 : 0;
			p.sumOfTotal += v[metricA] ? 1 : 0;
			p.finalVal = p.sumOfSub / p.sumOfTotal;
			return p;
		};
	};
	var reduceRemoveAvg = function(metricA) {
		return function(p,v) {
			p.sumOfSub -= v[metricA] ? v[metricA]*1 : 0;
			p.sumOfTotal -= v[metricA] ? 1 : 0;
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
			dimensions[name] = totaalDim.group().reduce(reduceAddAvg([name]),reduceRemoveAvg([name]),reduceInitialAvg);
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
				dimensions_scores[name] = totaalDim.group().reduce(reduceAddAvg([name_score]),reduceRemoveAvg([name_score]),reduceInitialAvg);
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
		
	
	///////////////////////////////
	// SET UP ALL INDICATOR HTML //
	///////////////////////////////
	
	//Create table with current crossfilter-selection output, so that you can also access this in other ways than through DC.js
	// var fill_keyvalues = function() {
		// var keyvalue = [];
		// tables.forEach(function(t) {
			// var key = t.name;
			// if (t.propertyPath === 'value.finalVal') {
				// if (isNaN(dimensions[t.name].top(1)[0].value.finalVal)) {
					// keyvalue[key] =  'N.A. on this level'; 
				// } else if(t.format /*meta_format[t.name]*/ === 'decimal0'){
					// keyvalue[key] = dec0Format(dimensions[t.name].top(1)[0].value.finalVal);
				// } else if(t.format /*meta_format[t.name]*/ === 'percentage'){
					// keyvalue[key] = percFormat(dimensions[t.name].top(1)[0].value.finalVal);
				// } else if(t.format /*meta_format[t.name]*/ === 'decimal2'){
					// keyvalue[key] = dec2Format(dimensions[t.name].top(1)[0].value.finalVal);
				// } else if(t.format /*meta_format[t.name]*/ === 'decimal1'){
					// keyvalue[key] = dec1Format(dimensions[t.name].top(1)[0].value.finalVal);
				// }
			// } else if(t.propertyPath === 'value') {
				// if (isNaN(dimensions[t.name].top(1)[0].value)) {
					// keyvalue[key] =  'N.A. on this level'; 
				// } else if(t.format /*meta_format[t.name]*/ === 'decimal0'){
					// keyvalue[key] = dec0Format(dimensions[t.name].top(1)[0].value);
				// } else if(t.format /*meta_format[t.name]*/ === 'percentage'){
					// keyvalue[key] = percFormat(dimensions[t.name].top(1)[0].value);
				// } else if(t.format /*meta_format[t.name]*/ === 'decimal2'){
					// keyvalue[key] = dec2Format(dimensions[t.name].top(1)[0].value);
				// } else if(t.format /*meta_format[t.name]*/ === 'decimal1'){
					// keyvalue[key] = dec1Format(dimensions[t.name].top(1)[0].value.finalVal);
				// }
			// }
		// });
		// return keyvalue;
	// };
	// var keyvalue = fill_keyvalues();
	
	
	
	//Define the colors and thresholds for the selected indicator
	mapchartColors_func = function() {
		var color_group = metric.split('.')[0].concat((metric.split('.')[1]) ? '.'.concat(metric.split('.')[1]) : '');
		color_range = [];
		colors = [];
		for (j=0;j<d.Colors.length;j++) {
			if (d.Colors[j].Indicator_code == color_group && d.Colors[j].ValueTo !== 'NULL') {
				var record = {threshold: d.Colors[j].ValueTo.replace(',','.'), HEX: d.Colors[j].HEX};
				color_range.push(record);
				colors.push(d.Colors[j].HEX);
			}
		}
		color_range.sort(function(a,b) {
			return parseFloat(a.threshold) - parseFloat(b.threshold);
		});
		return d3.scale.quantile()
				.domain([])
				.range(colors);
	};
	mapchartColors = mapchartColors_func();
	
	var color_cat = function(ind) {
		
		var width = dimensions_scores[ind].top(1)[0].value.finalVal;
		
		var color_group = ind.split('.')[0].concat((ind.split('.')[1]) ? '.'.concat(ind.split('.')[1]) : '');
		color_ranges = [];
		for (j=0;j<d.Colors.length;j++) {
			if (d.Colors[j].Indicator_code == color_group && d.Colors[j].ValueTo !== 'NULL') {
				var record = {threshold: d.Colors[j].ValueTo.replace(',','.'), HEX: d.Colors[j].HEX};
				color_ranges.push(record);
			}
		}
		color_range.sort(function(a,b) {
			return parseFloat(a.threshold) - parseFloat(b.threshold);
		});
		if (isNaN(width)) {return '#ccc';}	
		else if (width<=color_ranges[0].threshold) {return color_ranges[0].HEX;} 
		else if (width<=color_ranges[1].threshold) {return color_ranges[1].HEX;} 
		else if (width<=color_ranges[2].threshold) {return color_ranges[2].HEX;} 
		else if (width<=color_ranges[3].threshold) {return color_ranges[3].HEX;} 
		else if (width<=color_ranges[4].threshold) {return color_ranges[4].HEX;} 
	};					
				
	// var high_med_low = function(ind,ind_score) {
		
		// if (dimensions_scores[ind]) {
			// var width = dimensions_scores[ind].top(1)[0].value.finalVal;
			// if (isNaN(width)) {return 'notavailable';}
			// else if (width < 3.5) { return 'good';} 
			// else if (width <= 4.5) {return 'medium-good';}
			// else if (width <= 5.5) {return 'medium';}
			// else if (width <= 6.5) {return 'medium-bad';}
			// else if (width > 6.5) { return 'bad';} 
		// }				
	// };	
	

	
	
	var createHTML = function() {
		
		var risk_score = document.getElementById('risk_score_main');
		if (risk_score) {
			//risk_score.textContent = keyvalue.INFORM; //risk_score;
			risk_score.setAttribute('class','component-score'); // ' + high_med_low('INFORM','INFORM'));					
		}
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		if (vulnerability_score) {
			//vulnerability_score.textContent = keyvalue.VU; //vulnerability_score;
			vulnerability_score.setAttribute('class','component-score'); // ' + high_med_low('VU','VU'));				
		}
		var hazard_score = document.getElementById('hazard_score_main');
		if (hazard_score) {
			//hazard_score.textContent = keyvalue.HA; //hazard_score;
			hazard_score.setAttribute('class','component-score'); // ' + high_med_low('HA','HA'));				
		}
		var coping_score = document.getElementById('coping_capacity_score_main');
		if (coping_score) {
			//coping_score.textContent = keyvalue.CC; //coping_capacity_score;
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
		if (VU) {while (VU.firstChild) { VU.removeChild(VU.firstChild); };}
		if (HA) {while (HA.firstChild) { HA.removeChild(HA.firstChild); };}
		if (CC) {while (CC.firstChild) { CC.removeChild(CC.firstChild); };}
		
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (!meta_icon[record.name]) {var icon = 'img/undefined.png';}
			else {icon = 'img/' + record.name.substring(0,2) + '.png';};
			
			if (record.level == 1) {
				
				var width = dimensions_scores[record.name].top(1)[0].value.finalVal*10;
				
				//NEW for INFORM multi-level
				var div_heading = document.createElement('div');
				div_heading.setAttribute('id','heading'+record.name.split('.').join('-'));
				div_heading.setAttribute('class','accordion-header level1');
				var parent = document.getElementById(record.group)
				parent.appendChild(div_heading);
				var a_prev = document.createElement('a');
				a_prev.setAttribute('data-toggle','collapse');
				a_prev.setAttribute('href','#collapse'+record.name.split('.').join('-'));
				div_heading.appendChild(a_prev);
				var div_collapse = document.createElement('div');
				div_collapse.setAttribute('id','collapse'+record.name.split('.').join('-'));
				div_collapse.setAttribute('class','panel-collapse collapse level1');
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
				//div1a.innerHTML = keyvalue[record.name];
				div1.appendChild(div1a);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5');
				div.appendChild(div2);
				var div2a = document.createElement('div');
				div2a.setAttribute('class','component-scale');
				div2.appendChild(div2a);
				 var div2a1 = document.createElement('div');
				div2a1.setAttribute('class','score-bar'); // + color_cat(record.name,record.scorevar_name));
				div2a1.setAttribute('id','bar-'+record.name);
				div2a1.setAttribute('style','width:0%; background:' + color_cat(record.name)); //'+ width + '%');
				div2a.appendChild(div2a1);
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
	createHTML();
	
	var createHTML_level2 = function() {
		
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (!meta_icon[record.name]) {var icon = 'img/undefined.png';}
			else {icon = 'img/' + record.name.substring(0,2) + '.png';};
			
			if (record.level == 2) {
				
				var width = dimensions_scores[record.name].top(1)[0].value.finalVal*10;
				
				//NEW for INFORM multi-level
				var div_heading = document.createElement('div');
				div_heading.setAttribute('id','heading'+record.name.split('.').join('-'));
				div_heading.setAttribute('class','accordion-header level2');
				var parent = document.getElementById('collapse'+record.group.split('.').join('-'))
				parent.appendChild(div_heading);
				var a_prev = document.createElement('a');
				a_prev.setAttribute('data-toggle','collapse');
				a_prev.setAttribute('href','#collapse'+record.name.split('.').join('-'));
				div_heading.appendChild(a_prev);
				var div_collapse = document.createElement('div');
				div_collapse.setAttribute('id','collapse'+record.name.split('.').join('-'));
				div_collapse.setAttribute('class','panel-collapse collapse level2');
				parent.appendChild(div_collapse);
				//END new part
				var div = document.createElement('div');
				div.setAttribute('class','component-section');
				div.setAttribute('style','background-color:#f3f3f3');	//NEW
				//var parent = document.getElementById('collapse'+record.group.split('.').join('-')); //UPDATED
				a_prev.appendChild(div); //parent.appendChild(div);
				//var div0 = document.createElement('div');
				//div0.setAttribute('class','col-md-2');
				//div.appendChild(div0);	
				//var img1 = document.createElement('img');
				//img1.setAttribute('style','height:20px');
				//img1.setAttribute('src',icon);
				//div0.appendChild(img1);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col-md-5 component-label');
				div1.setAttribute('style','padding-left: 5px');
				div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				//$compile(div1)($scope);
				div.appendChild(div1);	
				var div1a = document.createElement('div');
				div1a.setAttribute('class','component-score'); // ' + high_med_low(record.name,record.scorevar_name));
				div1a.setAttribute('id',record.name);
				//div1a.innerHTML = keyvalue[record.name];
				div1.appendChild(div1a);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5');
				div.appendChild(div2);
				var div2a = document.createElement('div');
				div2a.setAttribute('class','component-scale');
				div2.appendChild(div2a);
				var div2a1 = document.createElement('div');
				div2a1.setAttribute('class','score-bar ');// + color_cat(record.name,record.scorevar_name));
				div2a1.setAttribute('id','bar-'+record.name);
				div2a1.setAttribute('style','width:0%; background:' + color_cat(record.name)); //'+ width + '%');'); //'+ width + '%');
				div2a.appendChild(div2a1);
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
	createHTML_level2();
	
	var createHTML_level3 = function() {
		
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (!meta_icon[record.name]) {var icon = 'img/undefined.png';}
			else {icon = 'img/' + record.name.substring(0,2) + '.png';};
			
			if (record.level == 3) {
				
				var width = dimensions_scores[record.name].top(1)[0].value.finalVal*10;
								
				var div = document.createElement('div');
				div.setAttribute('class','component-section');
				div.setAttribute('style','background-color:#d9dcdc; color:black');	//NEW
				var parent = document.getElementById('collapse'+record.group.split('.').join('-')); //UPDATED
				parent.appendChild(div);
				//var div0 = document.createElement('div');
				//div0.setAttribute('class','col-md-2');
				//div.appendChild(div0);	
				//var img1 = document.createElement('img');
				//img1.setAttribute('style','height:20px');
				//img1.setAttribute('src',icon);
				//div0.appendChild(img1);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col-md-5 component-label');
				div1.setAttribute('style','padding-left: 5px');
				div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				//$compile(div1)($scope);
				div.appendChild(div1);	
				var div1a = document.createElement('div');
				div1a.setAttribute('class','component-score'); // ' + high_med_low(record.name,record.scorevar_name));
				div1a.setAttribute('id',record.name);
				//div1a.innerHTML = keyvalue[record.name];
				div1.appendChild(div1a);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5');
				div.appendChild(div2);
				var div2a = document.createElement('div');
				div2a.setAttribute('class','component-scale');
				div2.appendChild(div2a);
				var div2a1 = document.createElement('div');
				div2a1.setAttribute('class','score-bar ');// + color_cat(record.name,record.scorevar_name));
				div2a1.setAttribute('id','bar-'+record.name);
				div2a1.setAttribute('style','width:0%; background:' + color_cat(record.name)); //'+ width + '%');'); //'+ width + '%');
				div2a.appendChild(div2a1);
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
	createHTML_level3();
	
	var keyvalues1 = function(filters) {
		
		var data_area = data_final.filter(function(obj) { return filters[0] == obj.pcode; });	
		var keyvalue = [];
		tables.forEach(function(t) {
			var key = t.name;
			//keyvalue[key] = dec1Format(data_area[0][key]);
			keyvalue[key] = data_area[0][key];
		});
		return keyvalue;
		
	};
	
	var keyvalues2 = function(filters) {
		
		var data_area = data_final.filter(function(obj) { return filters[1] == obj.pcode; });	
		var keyvalue2 = [];
		tables.forEach(function(t) {
			var key = t.name;
			//keyvalue2[key] = dec1Format(data_area[0][key]);
			keyvalue2[key] = data_area[0][key];
		});
		return keyvalue2;
	};
	
	var updateHTML = function(keyvalue,keyvalue2) {
		
		
		var risk_score = document.getElementById('risk_score_main');
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		var hazard_score = document.getElementById('hazard_score_main');
		var coping_score = document.getElementById('coping_capacity_score_main');
		if (mapfilters_length == 1) {
			if (risk_score) {
				risk_score.textContent = keyvalue.INFORM; //risk_score;
				//risk_score.setAttribute('class','component-score ');// + high_med_low('INFORM','INFORM'));
				risk_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));							
			}
			if (vulnerability_score) {
				vulnerability_score.textContent = keyvalue.VU;
				//vulnerability_score.setAttribute('class','component-score ');// + high_med_low('VU','VU'));		
				//vulnerability_score.setAttribute('style','color: ' + color_cat('VU'));									
			}
			if (hazard_score) {
				hazard_score.textContent = keyvalue.HA;
				//hazard_score.setAttribute('class','component-score ');// + high_med_low('HA','HA'));
				//hazard_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));											
			}
			if (coping_score) {
				coping_score.textContent = keyvalue.CC;
				//coping_score.setAttribute('class','component-score ');// + high_med_low('CC','CC'));
				//coping_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));											
			}
		//} else if (mapfilters_length == 2) {
			
		} else {
			if (risk_score) {
				risk_score.textContent = null; //keyvalue.INFORM; //risk_score;
				//risk_score.setAttribute('class','component-score ' + high_med_low('INFORM','INFORM'));	
				//risk_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));											
			}
			if (vulnerability_score) {
				vulnerability_score.textContent = null; //keyvalue.VU;
				//vulnerability_score.setAttribute('class','component-score' + high_med_low('VU','VU'));	
				//vulnerability_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));										
			}
			if (hazard_score) {
				hazard_score.textContent = null; //keyvalue.HA;
				//hazard_score.setAttribute('class','component-score' + high_med_low('HA','HA'));	
				//hazard_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));										
			}
			if (coping_score) {
				coping_score.textContent = null; //keyvalue.CC;
				//coping_score.setAttribute('class','component-score' + high_med_low('CC','CC'));	
				//coping_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));										
			}
		}
		;
					
		
		
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (record.level >= 1) { 
				
				if (mapfilters_length == 1) {
					
					// var bar = document.getElementById('bar-'+record.name+'-2');
					// if (bar) { var bar_par = bar.parentNode;}
					// if (bar_par) { while (bar_par.firstChild) { bar_par.removeChild(bar_par.firstChild); }; };
					// if (bar_par) {bar_par.remove();}
					
					var width = keyvalue[record.name]*10; //dimensions_scores[record.name].top(1)[0].value.finalVal*10;
					var div1a = document.getElementById(record.name);
					div1a.setAttribute('class','component-score'); // ' + high_med_low(record.name,record.scorevar_name));
					
					div1a.innerHTML = dec1Format(keyvalue[record.name]);
					var div2a1 = document.getElementById('bar-'+record.name);
					div2a1.setAttribute('class','score-bar ');// + high_med_low(record.name,record.scorevar_name));
					div2a1.setAttribute('style','width:'+ width + '%; background:' + color_cat(record.name));
				
				// } else if (mapfilters_length == 2) {
					
					// var width = keyvalue2[record.name]*10;
					// var div2 = document.getElementById('bar-'+record.name).parentNode.parentNode;
					
					// var div2a = document.createElement('div');
					// div2a.setAttribute('class','component-scale');
					// div2.appendChild(div2a);
					// var div2a1 = document.createElement('div');
					// div2a1.setAttribute('class','score-bar'); // + color_cat(record.name,record.scorevar_name));
					// div2a1.setAttribute('id','bar-'+record.name+'-2');
					// div2a1.setAttribute('style','width:'+ width + '%; background:' + color_cat(record.name));
					// div2a.appendChild(div2a1);
					
					
				} else {
					
					// var bar = document.getElementById('bar-'+record.name+'-2');
					// if (bar) { var bar_par = bar.parentNode;}
					// if (bar_par) { while (bar_par.firstChild) { bar_par.removeChild(bar_par.firstChild); }; };
					// if (bar_par) {bar_par.remove();}
					
					var div1a = document.getElementById(record.name);
					div1a.innerHTML = null; //keyvalue[record.name];
					var div2a1 = document.getElementById('bar-'+record.name);
					div2a1.setAttribute('class','score-bar ');// + high_med_low(record.name,record.scorevar_name));
					div2a1.setAttribute('style','width:0%'); //'+ width + '%');
					
					
				}
			}
		}
	};
	
	
	
	
	/////////////////
	// CHART SETUP //
	/////////////////
	
	// Clear the charts
	dc.chartRegistry.clear();
	if (map !== undefined) { map.remove(); }
	
	//define dc-charts (the name-tag following the # is how you refer to these charts in html with id-tag)
	var mapChart = dc.leafletChoroplethChart('#map-chart');
	var rowChart = dc.rowChart('#row-chart');
	//var tableChart = dc.dataTable('#table-chart');
		
		
		
	/////////////////////
	// MAP CHART SETUP //
	/////////////////////
	
	
			
	//Set up the map itself with all its properties
	//var map_filters = [];
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
				//else if (d<3.5) {return '#1a9641';} else if (d<=4.5) {return '#a6d96a';} else if (d<=5.5) {return '#f1d121';} else if (d<=6.5) {return '#fd6161';} else if (d>6.5) {return '#d7191c';}
				else if (d<=color_range[0].threshold) {return color_range[0].HEX;} 
				else if (d<=color_range[1].threshold) {return color_range[1].HEX;} 
				else if (d<=color_range[2].threshold) {return color_range[2].HEX;} 
				else if (d<=color_range[3].threshold) {return color_range[3].HEX;} 
				else if (d<=color_range[4].threshold) {return color_range[4].HEX;} 
			}
		})
		.featureKeyAccessor(function(feature){
			return feature.id; //feature.properties.pcode;
		})
		.popup(function(d){
			return lookup[d.key].concat(' - ',meta_label[metric],': ',currentFormat(d.value));
		})
		.renderPopup(true)
		.turnOnControls(true)
		.legend(dc.leafletLegend().position('topleft'))
		//Set up what happens when clicking on the map (popup appearing mainly)
		.on('filtered',function(chart,filters){
			filters = chart.filters();
			map_filters = chart.filters();
			var popup = document.getElementById('mapPopup');
			popup.style.visibility = 'hidden';
			//document.getElementById('zoomin_icon').style.visibility = 'hidden';
			for (var i=0;i<$('.filter-count').length;i++){
				if (filters.length == 0) {$('.filter-count')[i].innerHTML = data_final.length; }
				else { $('.filter-count')[i].innerHTML = filters.length; }
			};	
			if (filters.length > mapfilters_length) {
				//$apply(function() {
					name_popup = lookup[filters[filters.length - 1]];
					for (var i=0;i<$('.name_popup').length;i++){ $('.name_popup')[i].innerHTML = name_popup; };
					for (var i=0;i<data_final.length;i++) {
						var record = data_final[i];
						if (record.pcode === filters[filters.length - 1]) {
							value_popup = currentFormat(record[metric]); 
							for (var i=0;i<$('.value_popup').length;i++){ $('.value_popup')[i].innerHTML = value_popup; };	
							break;
						};
					}
					metric_label = meta_label[metric];
					for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
				//})
				//In Firefox, EVENT is not a global variable >> Not figured out how to fix this, so gave the popup a fixed position in FF only
				if (typeof event !== 'undefined') {
					popup.style.left = event.pageX + 'px';	
					popup.style.top = event.pageY + 'px';
				} else {
					popup.style.left = '400px';	
					popup.style.top = '100px';
				}
				popup.style.visibility = 'visible';
				//document.getElementById('zoomin_icon').style.visibility = 'visible';
			} 
			mapfilters_length = filters.length;
			//Recalculate all figures
			if (mapfilters_length == 1) {var keyvalue = keyvalues1(filters);}
			if (mapfilters_length == 2) {var keyvalue2 = keyvalues2(filters);}
			updateHTML(keyvalue,keyvalue2);
			//let reset-button (dis)appear
			var resetbutton = document.getElementsByClassName('reset-button')[0];	
			if (filters.length > 0) {
				resetbutton.style.visibility = 'visible';
			} else {
				resetbutton.style.visibility = 'hidden';
			}
			
		})
	;
	

	

	
	
	/////////////////////
	// ROW CHART SETUP //
	/////////////////////
	
	var row_filters = [];
	rowChart
		.width($('#row-chart').width()-150)
		.height((15 + 5) * 191 + 50)
		.dimension(whereDimension_tab)
		.group(whereGroupSum_tab_scores)
		// .data(function(group) {
			// return group.top(Infinity);
		// })
		.ordering(function(d) {return -d.value;})
		.fixedBarHeight(15)
		.colors(mapchartColors)
		.colorCalculator(function(d){
			if (d.value==0) {return '#cccccc';}
			else if (d.value<=color_range[0].threshold) {return color_range[0].HEX;} 
			else if (d.value<=color_range[1].threshold) {return color_range[1].HEX;} 
			else if (d.value<=color_range[2].threshold) {return color_range[2].HEX;} 
			else if (d.value<=color_range[3].threshold) {return color_range[3].HEX;} 
			else if (d.value<=color_range[4].threshold) {return color_range[4].HEX;} 
		})
		.label(function(d) {
			return lookup[d.key] ? lookup[d.key].concat(' - ',currentFormat(d.value)) : d.key.concat(' - ',currentFormat(d.value));
		})
		.labelOffsetX(function(d) {return (rowChart.width()-50) * (d.value / 10) + 10;})
		.title(function(d) {
			return lookup[d.key] ? lookup[d.key].concat(' - ',currentFormat(d.value)) : d.key.concat(' - ',currentFormat(d.value));
		})
		.on('filtered',function(chart,filters){
			filters = chart.filters();
			row_filters = chart.filters();
			for (var i=0;i<$('.filter-count').length;i++){
				if (filters.length == 0) {$('.filter-count')[i].innerHTML = data_final.length; }
				else { $('.filter-count')[i].innerHTML = filters.length; }
			};	
			if (filters.length == 1) {var keyvalue = keyvalues();}
			if (filters.length == 2) {var keyvalue2 = keyvalues2();}
			updateHTML(keyvalue,keyvalue2);	
			var resetbutton = document.getElementsByClassName('reset-button')[0];	
			if (filters.length > 0) { resetbutton.style.visibility = 'visible'; } else { resetbutton.style.visibility = 'hidden'; }
		})
		.elasticX(false)
		.x(d3.scale.linear().range([0,(rowChart.width()-50)]).domain([0,10]))
		.xAxis().scale(rowChart.x())
		//.xAxis().ticks(10)
		;
	
	sort = function(type) {
		if (type === 'value') {
			rowChart.ordering(function(d) {return -d.value;});
			rowChart.redraw();
		} else if (type == 'name') {
			rowChart.ordering(function(d) {return d.key;});
			rowChart.redraw();
		}
		
	}

	/////////////////////
	// TABLE CHART SETUP //
	/////////////////////
		
	/* tableChart
		.width(960)
		.height(800)
		.dimension(whereDimension_tab)
		.group(function(d) {return '';})
		.size(200)
		.columns([
			  function(d) { return d.pcode; },
			  function(d) { return d[metric]; }
			])
		.sortBy(function (d) {
			return d[metric];
		})
		.order(d3.descending)
		;
		
	// Programmatically insert header labels for table
    var tableHeader = d3.select(".table-header").selectAll("th");
    
	// Bind data to tableHeader selection.
    tableHeader = tableHeader.data(
      [
        {label: "Country", field_name: "pcode", sort_state: "ascending"},
        {label: "Indicator", field_name: "indicator", sort_state: "descending"}
      ]
    );
	
    // enter() into virtual selection and create new <th> header elements for each table column
    tableHeader = tableHeader.enter()
		.append("th")
        .text(function (d) { return d.label; }) // Accessor function for header titles
        .on("click", tableHeaderCallback);
		
    function tableHeaderCallback(d) {
      // Highlight column header being sorted and show bootstrap glyphicon
      var activeClass = "info";
      d3.selectAll("#table-chart th") // Disable all highlighting and icons
          .classed(activeClass, false)
        .selectAll("span")
          .style("visibility", "hidden") // Hide glyphicon
      var activeSpan = d3.select(this) // Enable active highlight and icon for active column for sorting
          .classed(activeClass, true)  // Set bootstrap "info" class on active header for highlight
        .select("span")
          .style("visibility", "visible");
      // Toggle sort order state to user desired state
      d.sort_state = d.sort_state === "ascending" ? "descending" : "ascending";
      var isAscendingOrder = d.sort_state === "ascending";
      tableChart
        .order(isAscendingOrder ? d3.ascending : d3.descending)
        .sortBy(function(datum) { return datum[d.field_name]; });
      // Reset glyph icon for all other headers and update this headers icon
      activeSpan.node().className = ''; // Remove all glyphicon classes
      // Toggle glyphicon based on ascending/descending sort_state
      activeSpan.classed(
        isAscendingOrder ? "glyphicon glyphicon-sort-by-attributes" :
          "glyphicon glyphicon-sort-by-attributes-alt", true);
      updateTable();
      tableChart.redraw();
    }
	
    // Initialize sort state and sort icon on one of the header columns
    // Highlight "Max Conf" cell on page load
    // This can be done programmatically for user specified column
    tableHeader.filter(function(d) { return d.label === "Country"; })
        .classed("info", true);
		
    var tableSpans = tableHeader
		.append("span") // For Sort glyphicon on active table headers
        .classed("glyphicon glyphicon-sort-by-attributes-alt", true)
        .style("visibility", "hidden")
		.filter(function(d) { return d.label === "Country"; })
        .style("visibility", "visible");
    

	// tableChart
		// .width(960)
		// .height(800)
		// .dimension(whereDimension_tab)
		// .group(function(d) { return '';}) // Must pass in. Ignored since .showGroups(false)
		// .size(Infinity)
		// .columns([
			  // function(d) { return d.pcode; },
			  // function(d) { return d[metric]; }
			// ])
		// .sortBy(function(d){ return d[metric]; }) // Initially sort by max_conf column
		// .order(d3.descending)
		// ;
		
    //updateTable();
    tableChart.redraw();
	 */


			
	///////////////////////////
	// MAP RELATED FUNCTIONS //
	///////////////////////////

	map_coloring = function(id) {

		metric = id;
		metric_label = meta_label[id];
		mapchartColors = mapchartColors_func();
		whereGroupSum_scores.dispose();
		whereGroupSum_scores = whereDimension.group().reduceSum(function(d) { if (!meta_scorevar[metric]) {return d[metric];} else { return d[meta_scorevar[metric]];};});
		whereGroupSum_tab_scores = whereDimension_tab.group().reduceSum(function(d) { if (!meta_scorevar[metric]) {return d[metric];} else { return d[meta_scorevar[metric]];};});
		mapChart
			.group(whereGroupSum_scores)
			.colors(mapchartColors)
			.colorCalculator(function(d){
				if (!meta_scorevar[metric]){
					return d ? mapChart.colors()(d) : '#cccccc';
				} else {
					if (d==0) {return '#cccccc';} 
					//else if (d<3.5) {return '#1a9641';} else if (d<=4.5) {return '#a6d96a';} else if (d<=5.5) {return '#f1d121';} else if (d<=6.5) {return '#fd6161';} else if (d>6.5) {return '#d7191c';}
					else if (d<=color_range[0].threshold) {return color_range[0].HEX;} 
					else if (d<=color_range[1].threshold) {return color_range[1].HEX;} 
					else if (d<=color_range[2].threshold) {return color_range[2].HEX;} 
					else if (d<=color_range[3].threshold) {return color_range[3].HEX;} 
					else if (d<=color_range[4].threshold) {return color_range[4].HEX;} 
				}
			})
		;
		rowChart
			.group(whereGroupSum_tab_scores)
			.colors(mapchartColors)
			.colorCalculator(function(d){
				if (!meta_scorevar[metric]){
					return d ? mapChart.colors()(d) : '#cccccc';
				} else {
					if (d.value==0) {return '#cccccc';} 
						else if (d.value<=color_range[0].threshold) {return color_range[0].HEX;} 
						else if (d.value<=color_range[1].threshold) {return color_range[1].HEX;} 
						else if (d.value<=color_range[2].threshold) {return color_range[2].HEX;} 
						else if (d.value<=color_range[3].threshold) {return color_range[3].HEX;} 
						else if (d.value<=color_range[4].threshold) {return color_range[4].HEX;} 
					}
				})
		;
		dc.redrawAll();
		for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
		document.getElementById('indicator-button').style.backgroundColor = color_range[3].HEX;
		document.getElementsByClassName('reset-button')[0].style.backgroundColor = color_range[3].HEX;
		document.getElementById('mapPopup').style.visibility = 'hidden';
		//document.getElementById('zoomin_icon').style.visibility = 'hidden';
	};
	
	
	
	
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
		metric_icon = 'img/' + metric.substring(0,2) + '.png';
		for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };
		for (var i=0;i<$('.metric_year').length;i++){ $('.metric_year')[i].innerHTML = metric_year; };
		for (var i=0;i<$('.metric_source').length;i++){ $('.metric_source')[i].innerHTML = metric_source; };
		for (var i=0;i<$('.metric_desc').length;i++){ $('.metric_desc')[i].innerHTML = metric_desc; };
		document.getElementsByClassName('metric_icon')[0].setAttribute('src',metric_icon);
		$('#infoModal').modal('show');
	};
	
	//Export to CSV function
	export_csv = function() {
		var content = data_final;
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
	

	// ACCORDION AUTOMATIC CLOSING
	// Make sure that when opening another accordion-panel, the current one collapses	
	// LEVEL 0
	var acc = document.getElementsByClassName('accordion-header level0');
	var panel = document.getElementsByClassName('collapse level0');
	var active = panel[0];
	
	for (var i = 0; i < acc.length; i++) {
		acc[i].onclick = function() {
			var active_new = document.getElementById(this.id.replace('heading','collapse'));
			if (active.id !== active_new.id) {
				active.classList.remove('in');
			} 
			active = active_new;
		}
	}
	// LEVEL 1
	var acc1 = document.getElementsByClassName('accordion-header level1');
	var panel1 = document.getElementsByClassName('collapse level1');
	var active1 = panel1[0]; //document.getElementsByClassName('collapse in level1')[0];
	
	for (var i = 0; i < acc1.length; i++) {
		acc1[i].onclick = function() {
			var active_new1 = document.getElementById(this.id.replace('heading','collapse'));
			if (active1.id !== active_new1.id) {
				active1.classList.remove('in');
			} 
			active1 = active_new1;
		}
	}
	// LEVEL 2
	var acc2 = document.getElementsByClassName('accordion-header level2');
	var panel2 = document.getElementsByClassName('collapse level2');
	var active2 = panel2[0]; //document.getElementsByClassName('collapse in level2')[0];
	
	for (var i = 0; i < acc2.length; i++) {
		acc2[i].onclick = function() {
			var active_new2 = document.getElementById(this.id.replace('heading','collapse'));
			if (active2.id !== active_new2.id) {
				active2.classList.remove('in');
			} 
			active2 = active_new2;
		}
	}
	
	
	/////////////////////////
	// RENDER MAP AND PAGE //
	/////////////////////////
	
	//Render all dc-charts and -tables
	dc.renderAll();
	$('#row-chart-container').hide();
	//$('#table-chart').hide();
	
	reset_function = function() {
		dc.filterAll();
		dc.redrawAll();
		for (var i=0;i<$('.filter-count').length;i++){ $('.filter-count')[i].innerHTML = data_final.length; };	
	}
	
	
	map = mapChart.map();
	function zoomToGeom(geom){
		var bounds = d3.geo.bounds(geom);
		map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
	}
	zoomToGeom(d.Districts);
	
	var zoom_child = $('.leaflet-control-zoom')[0];
	var zoom_parent = $('.leaflet-bottom.leaflet-right')[0];
	zoom_parent.insertBefore(zoom_child,zoom_parent.childNodes[0]);
	
	//Switch between MAP and TABULAR view
    mapShow = function() {
		$('#row-chart-container').hide();   
		//$('#table-chart').hide();         
		$('#map-chart').show();
		
		//Zoom to selected countries in row-chart
		var districts_temp = JSON.parse(JSON.stringify(d.Districts));
		districts_temp.features = [];
		for (var i=0;i<d.Districts.features.length;i++){
			if (row_filters.indexOf(d.Districts.features[i].id) > -1) {
				districts_temp.features.push(d.Districts.features[i]);
			}
		}
		zoomToGeom(districts_temp);
	}
	
	tabularShow = function() {
		$('#map-chart').hide();
		$('#mapPopup').hide();
		$('#row-chart-container').show();
		//$('#table-chart').show();
	}
	
	
};

