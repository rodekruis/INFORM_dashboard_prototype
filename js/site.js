
//////////////////////
// DEFINE VARIABLES //
//////////////////////
		
//var country_code = '';
var inform_model = 'INFORM2017';
var workflow_id = 261;
var inform_levels = 7;				
var metric = 'INFORM';
var chart_show = 'map';
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
				
load_dashboard = function(inform_model,workflow_id) {
	  
	spinner_start();  
	
	metric = 'INFORM';
	if (inform_model == 'INFORM2017') { country_code = ''; } else { country_code = inform_model.replace('INFORM',''); };
		
	//Load data
	//var workflow = 'http://www.inform-index.org/API/InformAPI/workflows/GetByWorkflowGroup/';
	
	//Empty data-object
	d = {};
	//d3.json(workflow + inform_model, function(data){
	//d3.json('data/workflow' + country_code + '.json', function(data) {	
		//console.log(data);
		//Determine workflowId
		//var workflow_id = data[0].WorkflowId;
		//console.log(workflow_id);
	
		//Get links for data and metadata
		var url_meta = 'http://www.inform-index.org/API/InformAPI/Processes/GetByWorkflowId/' + workflow_id;
		
		// Load INFORM metadata
		var ignore_string = ['SS1','SS3'];
		//d3.json(url_meta, function(meta_data) {
		d3.json('data/metadata' + country_code + '.json', function(meta_data) {
			//console.log(meta_data);
			d.Metadata = $.grep(meta_data, function(e){ return e.VisibilityLevel <= 99 
																		&& e.VisibilityLevel <= inform_levels 
																		//&& e.StepNumber > 0
																		//&& e.Parent !== 'HA.NAT.TC.SS-REL'
																		//&& e.Parent !== 'HA.NAT.TC.SS-ABS'
																		//&& e.Parent !== 'VU.VGR.UP.POC-POP'
																		});
			inform_indicators = [];
			for (i=0;i<d.Metadata.length;i++) { inform_indicators.push(d.Metadata[i].OutputIndicatorName); }
			//inform_indicators = d.Metadata.map(a => a.OutputIndicatorName);
			
			//API-link with all needed indicators
			var url_data = 'http://www.inform-index.org/API/InformAPI/countries/Scores/?WorkflowId=' + workflow_id + '&IndicatorId=' + inform_indicators.toString();
			
			//Load INFORM data
			//d3.json(url_data, function(inform_data){
			d3.json('data/inform_data' + country_code + '.json', function(inform_data) {
				d.inform_data = inform_data; //$.grep(inform_data, function(e){ return inform_indicators.indexOf(e.IndicatorId) > -1;});// e.IndicatorId.split('.').length <= inform_levels; });
				
				//Load Geodata
				geo_data_url = 'countries' + country_code;
				//if (inform_model == 'INFORM_LBN') { geo_data_url = 'countries_LBN'; } else { geo_data_url = 'countries'};
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
	
	
	//});
	
	
	
};
load_dashboard(inform_model,workflow_id);



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
	
	
	//////////////////////////
	// SETUP META VARIABLES //
	//////////////////////////


	// get the lookup tables
	var lookup = genLookup(config.nameAttribute);
	
	var meta_label = genLookup_meta(d,'Fullname');
	var meta_level = genLookup_meta(d,'VisibilityLevel');
	//var meta_scorevar = genLookup_meta(d,'OutputIndicatorName');
	//var meta_format = genLookup_meta(d,'format');
	//var meta_unit = genLookup_meta(d,'unit');
	var meta_icon = genLookup_meta(d,'icon_src');
	//To fill
	var meta_year = genLookup_meta(d,'year');
	var meta_source = genLookup_meta(d,'source_link');
	var meta_desc = genLookup_meta(d,'description');
	
	metric_label = meta_label[metric];
	document.getElementById('metric_label').firstChild.innerHTML = metric_label;
	
	var max_stepnr = Math.max.apply(Math,d.Metadata.map(function(o){return o.StepNumber;}));
		
	tables = [];
	for (var i=0; i < d.Metadata.length; i++) {
		
		var record = {};
		var record_temp = d.Metadata[i];
		
		//Check per indicator the MIN and MAX to determine if we're dealing with a normalized (0-10) indicator
		var ind_data = $.grep(d.inform_data, function(e) {return e.IndicatorId == record_temp.OutputIndicatorName;});
		var ind_max = Math.max.apply(Math,ind_data.map(function(o){return o.IndicatorScore;}));
		var ind_min = Math.min.apply(Math,ind_data.map(function(o){return o.IndicatorScore;}));
		//Conditions used 
		if (ind_max <=10 		//Obvious
			&& ind_min >= 0 	//Obvious
			&& ind_max > 1.1		//This is to rule out 0-1 indicators (such as HDI or percentages)
			) {
			record.id = 'data-table' + [i+1];
			record.name = record_temp.OutputIndicatorName;
			record.format = 'decimal1';
			//record.unit = '';
			record.level = record_temp.VisibilityLevel;
			//record.level_new = max_stepnr - record_temp.StepNumber;
			record.group = record_temp.Parent == 'HA.NAT-TEMP' ? 'HA.NAT' : record_temp.Parent; //record_temp.OutputIndicatorName.substring(0,record_temp.OutputIndicatorName.lastIndexOf('.'));
			record.propertyPath = 'value.finalVal';
			record.dimension = undefined;
			record.weight_var = 'population'; //record_temp.weight_var;
			record.scorevar_name = record_temp.OutputIndicatorName; //record_temp.scorevar_name;
			tables.push(record);
		} else {
			// console.log(record_temp.OutputIndicatorName);
			// console.log(ind_max);
			// console.log(ind_min);
		}
		
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
		if (!this[a.Iso3]) {
			this[a.Iso3] = { pcode: a.Iso3, values: [] };
			grouped.push(this[a.Iso3]);
		}
		this[a.Iso3].values.push({ IndicatorId: a.IndicatorId, IndicatorScore: a.IndicatorScore });
	}, Object.create(null)); // Object.create creates an empty object without prototypes
	
	var data_final = [];
	for (var i=0; i < grouped.length; i++) {
		var record = {};
		var record_temp = grouped[i];
		record.pcode = record_temp.pcode;
		record.pcode_parent = '';
		for (var j=0; j < record_temp.values.length; j++) {
			var record_temp2 = record_temp.values[j];
			record[record_temp2.IndicatorId] = record_temp2.IndicatorScore == 0 ? '0.01' : String(record_temp2.IndicatorScore);
		}
		data_final[i] = record;
	}
	//console.log(data_final);
	
	
	// Start crossfilter
	var cf = crossfilter(data_final);	
	for (var i=0;i<$('.filter-count').length;i++){ $('.filter-count')[i].innerHTML = 'All '; };
	
	// The wheredimension returns the unique identifier of the geo area
	var whereDimension = cf.dimension(function(d) { return d.pcode; });
	var whereDimension_tab = cf.dimension(function(d) { return d.pcode; });
		
	// Create the groups for these two dimensions (i.e. sum the metric)
	var whereGroupSum = whereDimension.group().reduceSum(function(d) {return d[metric];});
	var whereGroupSum_tab2 = whereDimension.group().reduceSum(function(d) {return d[metric];});
	var whereGroupSum_tab = whereDimension_tab.group().reduceSum(function(d) {return d[metric];});
	//var whereGroupSum_scores = whereDimension.group().reduceSum(function(d) {if (d[metric]) {return d[metric];};});
	//var whereGroupSum_tab_scores = whereDimension_tab.group().reduceSum(function(d) { if (d[metric]) {return d[metric];};});
	
		
	// group with all, needed for data-count
	var all = cf.groupAll();
	// get the count of the number of rows in the dataset (total and filtered)
	dc.dataCount('#count-info')
		.dimension(cf)
		.group(all);
		
	
	
	///////////////////////////////
	// SET UP ALL INDICATOR HTML //
	///////////////////////////////
	
	
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
		var quantile_range = [];
		for (i=0;i<data_final.length;i++) {
			quantile_range[i] = data_final[i][metric];
			quantile_range.sort();
		};
		return d3.scale.quantile()
				.domain(quantile_range)
				.range(colors);
	};
	mapchartColors = mapchartColors_func();
	
	color_cat = function(ind) {
		
		var width = keyvalue[ind];
		var color_group = ind.split('.')[0].concat((ind.split('.')[1]) ? '.'.concat(ind.split('.')[1]) : '');
		if (color_group == 'HDI-Est') {color_group = 'VU.SEV';}
		color_ranges = [];
		for (j=0;j<d.Colors.length;j++) {
			if (d.Colors[j].Indicator_code == color_group && d.Colors[j].ValueTo !== 'NULL') {
				var record = {threshold: d.Colors[j].ValueTo.replace(',','.')*1, HEX: d.Colors[j].HEX};
				color_ranges.push(record);
			}
		}
		color_ranges.sort(function(a,b) {
			return parseFloat(a.threshold) - parseFloat(b.threshold);
		});
		if (isNaN(width)) {return '#ccc';}	
		else if (width<=color_ranges[0].threshold) {return color_ranges[0].HEX;} 
		else if (width<=color_ranges[1].threshold) {return color_ranges[1].HEX;} 
		else if (width<=color_ranges[2].threshold) {return color_ranges[2].HEX;} 
		else if (width<=color_ranges[3].threshold) {return color_ranges[3].HEX;} 
		else if (width<=color_ranges[4].threshold) {return color_ranges[4].HEX;} 
	};	
	
				

	
	
	var createHTML_level2 = function() {
		
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
			else {icon = 'img/' + record.name.substring(0,6) + '.png';};
			
			if (record.level == 2) {
				
				//var width = keyvalue[record.name]; //dimensions_scores[record.name].top(1)[0].value.finalVal*10;
				
				//NEW for INFORM multi-level
				var div_heading = document.createElement('div');
				div_heading.setAttribute('id','heading'+record.name.split('.').join('-'));
				div_heading.setAttribute('class','accordion-header level2');
				var parent = document.getElementById(record.group)
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
				a_prev.appendChild(div);
				var div0 = document.createElement('div');
				div0.setAttribute('class','col-md-2');
				div.appendChild(div0);	
				var img1 = document.createElement('img');
				img1.setAttribute('style','height:20px');
				img1.setAttribute('src',icon);
				div0.appendChild(img1);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col-md-4 component-label');
				div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				div.appendChild(div1);	
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5 bar-container');
				div.appendChild(div2);
				var div1a = document.createElement('div');
				div1a.setAttribute('class','component-score-small');
				div1a.setAttribute('id',record.name);
				div2.appendChild(div1a);
				var div2a = document.createElement('div');
				div2a.setAttribute('class','component-scale');
				div2.appendChild(div2a);
				var div2a1 = document.createElement('div');
				div2a1.setAttribute('class','score-bar'); // + color_cat(record.name,record.scorevar_name));
				div2a1.setAttribute('id','bar-'+record.name);
				div2a1.setAttribute('style','width:0%;border:none'); //; background:' + color_cat(record.name)); //'+ width + '%');
				div2a.appendChild(div2a1);
				var div3 = document.createElement('div');
				div3.setAttribute('class','col-sm-1 col-md-1 no-padding');
				div.appendChild(div3);
				var button = document.createElement('button');
				button.setAttribute('type','button');
				button.setAttribute('class','btn-modal');
				button.setAttribute('data-toggle','modal');
				button.setAttribute('onclick','info(\'' + record.name + '\')');
				div3.appendChild(button);
				var img3 = document.createElement('img');
				img3.setAttribute('src','img/icon-popup.svg');
				img3.setAttribute('style','height:17px;margin-bottom:3px;');
				button.appendChild(img3);
				
			} 
		}
	};
	createHTML_level2();
	
	var createHTML_level3 = function(input_level) {
		
		
		var grey_shades = ['#f0f0f0','#d9d9d9','#bdbdbd','#969696','#737373']
		var background_color = grey_shades[input_level-3];
		
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (record.level == input_level) {
				
				//var width = keyvalue[record.name]; //dimensions_scores[record.name].top(1)[0].value.finalVal*10;
				
				//NEW for INFORM multi-level
				var div_heading = document.createElement('div');
				div_heading.setAttribute('id','heading'+record.name.split('.').join('-'));
				div_heading.setAttribute('class','accordion-header level' + input_level);
				var parent = document.getElementById('collapse'+record.group.split('.').join('-'))
				if (parent) {
					parent.appendChild(div_heading);
					var a_prev = document.createElement('a');
					a_prev.setAttribute('data-toggle','collapse');
					a_prev.setAttribute('href','#collapse'+record.name.split('.').join('-'));
					div_heading.appendChild(a_prev);
					var div_collapse = document.createElement('div');
					div_collapse.setAttribute('id','collapse'+record.name.split('.').join('-'));
					div_collapse.setAttribute('class','panel-collapse collapse level' + input_level);
					parent.appendChild(div_collapse);
					//END new part
					var div = document.createElement('div');
					div.setAttribute('class','component-section');
					div.setAttribute('style','background-color:' + background_color + '; color:black');	//NEW
					var parent = document.getElementById('collapse'+record.group.split('.').join('-')); //UPDATED
					a_prev.appendChild(div);
					//var div0 = document.createElement('div');
					//div0.setAttribute('class','col-md-2');
					//div.appendChild(div0);	
					//var img1 = document.createElement('img');
					//img1.setAttribute('style','height:20px');
					//img1.setAttribute('src',icon);
					//div0.appendChild(img1);
					var div1 = document.createElement('div');
					div1.setAttribute('class','col-md-6 component-label');
					div1.setAttribute('style','padding-left: 5px');
					div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
					div1.innerHTML = meta_label[record.name];
					//$compile(div1)($scope);
					div.appendChild(div1);	
					var div2 = document.createElement('div');
					div2.setAttribute('class','col-md-5 bar-container');
					div.appendChild(div2);
					var div1a = document.createElement('div');
					div1a.setAttribute('class','component-score');
					div1a.setAttribute('id',record.name);
					div2.appendChild(div1a);
					var div2a = document.createElement('div');
					div2a.setAttribute('class','component-scale');
					div2.appendChild(div2a);
					var div2a1 = document.createElement('div');
					div2a1.setAttribute('class','score-bar');
					div2a1.setAttribute('id','bar-'+record.name);
					div2a1.setAttribute('style','width:0%; border:none');
					div2a.appendChild(div2a1);
					var div3 = document.createElement('div');
					div3.setAttribute('class','col-sm-1 col-md-1 no-padding');
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
	}
	createHTML_level3(3);
	createHTML_level3(4);
	createHTML_level3(5);
	createHTML_level3(6);
	createHTML_level3(7);
	
	
	var keyvalue = [];
	var keyvalues1 = function(filters) {
		
		var data_area = data_final.filter(function(obj) { return filters[0] == obj.pcode; });	
		keyvalue = [];
		tables.forEach(function(t) {
			var key = t.name;
			//keyvalue[key] = dec1Format(data_area[0][key]);
			keyvalue[key] = data_area[0][key];
		});
		return keyvalue;
		
	};
	
	// var keyvalue2 = [];
	// var keyvalues2 = function(filters) {
		
		// var data_area = data_final.filter(function(obj) { return filters[1] == obj.pcode; });	
		// keyvalue2 = [];
		// tables.forEach(function(t) {
			// var key = t.name;
			// keyvalue2[key] = data_area[0][key];
		// });
		// return keyvalue2;
	// };
	var mapfilters_length = 0;
	var rowfilters_length = 0;
	var updateHTML = function(keyvalue) { //,keyvalue2) {
		
		var risk_score = document.getElementById('risk_score_main');
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		var hazard_score = document.getElementById('hazard_score_main');
		var coping_score = document.getElementById('coping_capacity_score_main');
		if (mapfilters_length == 1 || rowfilters_length == 1) {
			if (risk_score) {
				risk_score.textContent = dec1Format(keyvalue.INFORM); //risk_score;
				//risk_score.setAttribute('class','component-score ');// + high_med_low('INFORM','INFORM'));
				risk_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));							
			}
			if (vulnerability_score) {
				vulnerability_score.textContent = dec1Format(keyvalue.VU);
				//vulnerability_score.setAttribute('class','component-score ');// + high_med_low('VU','VU'));		
				//vulnerability_score.setAttribute('style','color: ' + color_cat('VU'));									
			}
			if (hazard_score) {
				hazard_score.textContent = dec1Format(keyvalue.HA);
				//hazard_score.setAttribute('class','component-score ');// + high_med_low('HA','HA'));
				//hazard_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));											
			}
			if (coping_score) {
				coping_score.textContent = dec1Format(keyvalue.CC);
				//coping_score.setAttribute('class','component-score ');// + high_med_low('CC','CC'));
				//coping_score.setAttribute('style','color:#951301 ');// + color_cat('INFORM'));											
			}
		//} else if (mapfilters_length == 2) {
			
		} else {
			if (risk_score) {
				risk_score.textContent = ''; //keyvalue.INFORM; //risk_score;
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
		};
		
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (record.level >= 2) { 
				
				if (mapfilters_length == 1 || rowfilters_length == 1) {
					
					// var bar = document.getElementById('bar-'+record.name+'-2');
					// if (bar) { var bar_par = bar.parentNode;}
					// if (bar_par) { while (bar_par.firstChild) { bar_par.removeChild(bar_par.firstChild); }; };
					// if (bar_par) {bar_par.remove();}
					
					var width = keyvalue[record.name]*10; //dimensions_scores[record.name].top(1)[0].value.finalVal*10;
					var div1a = document.getElementById(record.name);
					div1a.setAttribute('class','component-score-small'); // ' + high_med_low(record.name,record.scorevar_name));
					div1a.setAttribute('style','border:solid; border-width:1px; border-color:black');
					
					div1a.innerHTML = isNaN(keyvalue[record.name]) ? '-' : dec1Format(keyvalue[record.name]);
					var div2a1 = document.getElementById('bar-'+record.name);
					div2a1.setAttribute('class','score-bar ');// + high_med_low(record.name,record.scorevar_name));
					div2a1.setAttribute('style','width:'+ width + '%; background:' + color_cat(record.name));
					//div2a1.innerHTML = dec1Format(keyvalue[record.name]);
				
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
					div1a.innerHTML = '';//null; //keyvalue[record.name];
					div1a.setAttribute('style','border:none');
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
	var map_filters = null;
	mapChart
		.width($('#map-chart').width())
		.height(800)
		.dimension(whereDimension)
		.group(whereGroupSum)
		.center([0,0])
		.zoom(0)
		.geojson(d.Districts)				
		.colors(mapchartColors)
		.colorCalculator(function(d){
			if (meta_level[metric] > 3){
				if (!d) {return '#cccccc';} else {return mapChart.colors()(d);}
			} else {
				if (!d) {return '#cccccc';} 
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
			map_filters = chart.filters();
			var popup = document.getElementById('mapPopup');
			//popup.style.visibility = 'hidden';
			//document.getElementById('zoomin_icon').style.visibility = 'hidden';
			if (chart_show == 'map') {
				for (var i=0;i<$('.filter-count').length;i++){
					if (map_filters.length == 1) {$('.filter-count')[i].innerHTML = lookup[map_filters[0]];} 
					else if (map_filters.length > 1) { $('.filter-count')[i].innerHTML = map_filters.length; }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};	
			}
			if (map_filters.length > mapfilters_length) {
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
					//for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
					document.getElementById('metric_label').firstChild.innerHTML = metric_label;
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
			mapfilters_length = map_filters.length;
			//Recalculate all figures
			if (mapfilters_length == 1) { var keyvalue = keyvalues1(map_filters); };
			//if (mapfilters_length == 2) {var keyvalue2 = keyvalues2(map_filters);}
			if (chart_show == 'map') { updateHTML(keyvalue);} //,keyvalue2);
			//let reset-button (dis)appear
			var resetbutton = document.getElementsByClassName('reset-button')[0];	
			if (map_filters.length > 0) {
				resetbutton.style.visibility = 'visible';
			} else {
				resetbutton.style.visibility = 'hidden';
			}			
		})
	;
	

	

	
	
	/////////////////////
	// ROW CHART SETUP //
	/////////////////////
	
	var row_filters = null;
	rowChart
		.width($('#row-chart').width()-150)
		.height((15 + 5) * 191 + 50)
		.dimension(whereDimension_tab)
		.group(whereGroupSum_tab)
		.ordering(function(d) {return -d.value;})
		.fixedBarHeight(15)
		.colors(mapchartColors)
		.colorCalculator(function(d){
			if (meta_level[metric] > 3){
				if (!d) {return '#cccccc';} else {return mapChart.colors()(d.value);}
			} else {
				if (!d) {return '#cccccc';} 
				else if (d.value<=color_range[0].threshold) {return color_range[0].HEX;} 
				else if (d.value<=color_range[1].threshold) {return color_range[1].HEX;} 
				else if (d.value<=color_range[2].threshold) {return color_range[2].HEX;} 
				else if (d.value<=color_range[3].threshold) {return color_range[3].HEX;} 
				else if (d.value<=color_range[4].threshold) {return color_range[4].HEX;} 
			}
		})
		.label(function(d) {
			return lookup[d.key] ? lookup[d.key].concat(' - ',currentFormat(d.value)) : d.key.concat(' - ',currentFormat(d.value));
		})
		.labelOffsetX(function(d) {return (rowChart.width()-50) * (d.value / 11) + 10;})
		.title(function(d) {
			return lookup[d.key] ? lookup[d.key].concat(' - ',currentFormat(d.value)) : d.key.concat(' - ',currentFormat(d.value));
		})
		.on('filtered',function(chart,filters){
			row_filters = chart.filters();
			//mapChart.filter(row_filters);
			if (chart_show == 'row') {
				for (var i=0;i<$('.filter-count').length;i++){
					if (row_filters.length == 1) { $('.filter-count')[i].innerHTML = lookup[row_filters[0]]; } 
					else if (row_filters.length > 1) { $('.filter-count')[i].innerHTML = row_filters.length; }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};	
			}
			rowfilters_length = row_filters.length;
			if (rowfilters_length == 1) { var keyvalue = keyvalues1(row_filters); };
			//if (mapfilters_length == 2) {var keyvalue2 = keyvalues2(row_filters);}
			if (chart_show == 'row') {updateHTML(keyvalue);} //,keyvalue2);
			var resetbutton = document.getElementsByClassName('reset-button')[0];	
			if (row_filters.length > 0) { resetbutton.style.visibility = 'visible'; } else { resetbutton.style.visibility = 'hidden'; }
		})
		.elasticX(false)
		.x(d3.scale.linear().range([0,(rowChart.width()-50)]).domain([0,11]))
		.xAxis().scale(rowChart.x())
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

	///////////////////////////
	// MAP RELATED FUNCTIONS //
	///////////////////////////

	map_coloring = function(id) {
		
		metric = id;
		metric_label = meta_label[id];
		mapchartColors = mapchartColors_func();
		whereGroupSum.dispose();
		whereGroupSum = whereDimension.group().reduceSum(function(d) { if (d[metric]) {return d[metric];};});
		whereGroupSum_tab.dispose();
		whereGroupSum_tab = whereDimension_tab.group().reduceSum(function(d) { if (d[metric]) {return d[metric];};});
		mapChart
			.group(whereGroupSum)
			.colors(mapchartColors)
			.colorCalculator(function(d){
				if (meta_level[metric] > 3){
					if (!d) {return '#cccccc';} else {return mapChart.colors()(d);}
				} else {
					if (!d) {return '#cccccc';} 
					else if (d<=color_range[0].threshold) {return color_range[0].HEX;} 
					else if (d<=color_range[1].threshold) {return color_range[1].HEX;} 
					else if (d<=color_range[2].threshold) {return color_range[2].HEX;} 
					else if (d<=color_range[3].threshold) {return color_range[3].HEX;} 
					else if (d<=color_range[4].threshold) {return color_range[4].HEX;} 
				}
			})
		;
		rowChart
			.group(whereGroupSum_tab)
			.colors(mapchartColors)
			.colorCalculator(function(d){
				if (meta_level[metric] > 3){
					if (!d) {return '#cccccc';} else {return mapChart.colors()(d.value);}
				} else {
					if (!d) {return '#cccccc';} 
					else if (d.value<=color_range[0].threshold) {return color_range[0].HEX;} 
					else if (d.value<=color_range[1].threshold) {return color_range[1].HEX;} 
					else if (d.value<=color_range[2].threshold) {return color_range[2].HEX;} 
					else if (d.value<=color_range[3].threshold) {return color_range[3].HEX;} 
					else if (d.value<=color_range[4].threshold) {return color_range[4].HEX;} 
				}
			})
		;
		dc.redrawAll();
		//for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
		document.getElementById('metric_label').firstChild.innerHTML = metric_label;
		
		//console.log($('#metric_label div').width());
		//console.log($('#metric_label').width());
		//if ( $('#metric_label div').width() > $('#metric_label').width() ) {
		//while( $('#metric_label div').width() > $('#metric_label').width() ) {
			//$('#metric_label div').css('font-size', (parseInt($('#metric_label div').css('font-size')) - 2) + "px" );
			//$('#metric_label div').css('font-size', (parseInt($('#metric_label div').css('font-size')) - 1) + "px" );
		//}
	
		document.getElementById('indicator-button').style.backgroundColor = color_range[3].HEX;
		document.getElementsByClassName('reset-button')[0].style.backgroundColor = color_range[3].HEX;
		document.getElementById('area_selection').style.color = color_range[3].HEX;
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
		var content = d.Metadata;
		// for (var i=0;i<content.length;i++){
			// content[i].name = lookup[content[i].pcode];
		// };
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
		download.click();
	};
	
	//Export to JSON
	export_json = function() {
		var myWindow = window.open('','','_blank');
		myWindow.document.write(JSON.stringify(d.inform_data))
		myWindow.focus();
	}
	
	//Export to GEOJSON
	link_data = function() {
		
		if (inform_model == 'INFORM_LBN') {
			var url = 'http://www.inform-index.org/Subnational/Lebanon';
		} else {
			var url = 'http://www.inform-index.org/INFORM-2017-Results-and-data';
		}
		var download = document.getElementById('download');
		download.setAttribute('href', url);
		download.click();
	}
	

	// ACCORDION AUTOMATIC CLOSING
	// Make sure that when opening another accordion-panel, the current one collapses	
	// LEVEL 1
	var acc = document.getElementsByClassName('accordion-header level1');
	var panel = document.getElementsByClassName('collapse level1');
	var active = panel[0];
	for (var i = 1; i < acc.length; i++) {
		acc[i].onclick = function() {
			var active_new = document.getElementById(this.id.replace('heading','collapse'));
			if (active.id !== active_new.id) {
				active.classList.remove('in');
			} 
			active = active_new;
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
	// LEVEL 3
	var acc3 = document.getElementsByClassName('accordion-header level3');
	var panel3 = document.getElementsByClassName('collapse level3');
	var active3 = panel3[0]; //document.getElementsByClassName('collapse in level3')[0];
	for (var i = 0; i < acc3.length; i++) {
		acc3[i].onclick = function() {
			var active_new3 = document.getElementById(this.id.replace('heading','collapse'));
			if (active3.id !== active_new3.id) {
				active3.classList.remove('in');
			} 
			active3 = active_new3;
		}
	}
	// LEVEL 4
	var acc4 = document.getElementsByClassName('accordion-header level4');
	var panel4 = document.getElementsByClassName('collapse level4');
	var active4 = panel4[0]; //document.getElementsByClassName('collapse in level4')[0];
	for (var i = 0; i < acc4.length; i++) {
		acc4[i].onclick = function() {
			var active_new4 = document.getElementById(this.id.replace('heading','collapse'));
			if (active4.id !== active_new4.id) {
				active4.classList.remove('in');
			} 
			active4 = active_new4;
		}
	}
	// LEVEL 5
	var acc5 = document.getElementsByClassName('accordion-header level5');
	var panel5 = document.getElementsByClassName('collapse level5');
	var active5 = panel5[0]; //document.getElementsByClassName('collapse in level5')[0];
	for (var i = 0; i < acc5.length; i++) {
		acc5[i].onclick = function() {
			var active_new5 = document.getElementById(this.id.replace('heading','collapse'));
			if (active5.id !== active_new5.id) {
				active5.classList.remove('in');
			} 
			active5 = active_new5;
		}
	}
	// LEVEL 6
	var acc6 = document.getElementsByClassName('accordion-header level6');
	var panel6 = document.getElementsByClassName('collapse level6');
	var active6 = panel6[0]; //document.getElementsByClassName('collapse in level6')[0];
	for (var i = 0; i < acc6.length; i++) {
		acc6[i].onclick = function() {
			var active_new6 = document.getElementById(this.id.replace('heading','collapse'));
			if (active6.id !== active_new6.id) {
				active6.classList.remove('in');
			} 
			active6 = active_new6;
		}
	}
	// LEVEL 7
	var acc7 = document.getElementsByClassName('accordion-header level7');
	var panel7 = document.getElementsByClassName('collapse level7');
	var active7 = panel7[0]; //document.getElementsByClassName('collapse in level7')[0];
	for (var i = 0; i < acc7.length; i++) {
		acc7[i].onclick = function() {
			var active_new7 = document.getElementById(this.id.replace('heading','collapse'));
			if (active7.id !== active_new7.id) {
				active7.classList.remove('in');
			} 
			active7 = active_new7;
		}
	}
 	
	var workflows = 'http://www.inform-index.org/API/InformAPI/Workflows/WorkflowGroups';
	d3.json(workflows,function(data_workflows) {
		
		active_workflow_groups = ['INFORM_GTM','INFORM2017'];
		active_workflow_names = ['INFORM GUATEMALA 2017','INFORM 2017 v0.3.1'];
		
		var ul = document.getElementById('country-items');
		while (ul.firstChild) { ul.removeChild(ul.firstChild);};
							
		for (var i=0;i<data_workflows.length;i++) {
			if (active_workflow_groups.indexOf(data_workflows[i]) > -1) {
				var workflow_info = 'http://www.inform-index.org/API/InformAPI/workflows/GetByWorkflowGroup/' + data_workflows[i];
				d3.json(workflow_info,function(workflow_info) {
					for (var j=0;j<workflow_info.length;j++) {
						if (workflow_info[j].Author == 'anonymous' && active_workflow_names.indexOf(workflow_info[j].Name) > -1) {
							
							//console.log(workflow_info[j]);
							
							var li = document.createElement('li');
							ul.appendChild(li);
							var a = document.createElement('a');
							a.setAttribute('class','submenu-item');
							a.setAttribute('onClick','load_dashboard(\'' + workflow_info[j].WorkflowGroupName + '\',' + workflow_info[j].WorkflowId + ')');
							a.setAttribute('role','button');
							a.innerHTML = workflow_info[j].Name;
							li.appendChild(a);
							
						}
					}
				});
			};
		};
	});
		

	
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
		for (var i=0;i<$('.filter-count').length;i++){ $('.filter-count')[i].innerHTML = 'All '; };	
		zoomToGeom(d.Districts);
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
		chart_show = 'map';
		//Hide row-chart
		$('#row-chart-container').hide();  
		//Transfer row-chart filters to map (to make sure that selection is carried)
		mapChart.filter([row_filters]); 
		//Show map-chart
		$('#map-chart').show();
		
		//Zoom to selected countries in row-chart
		if (row_filters.length == 0) {
			zoomToGeom(d.Districts);
		} else {
			var districts_temp = JSON.parse(JSON.stringify(d.Districts));
			districts_temp.features = [];
			for (var i=0;i<d.Districts.features.length;i++){
				if (row_filters.indexOf(d.Districts.features[i].id) > -1) {
					districts_temp.features.push(d.Districts.features[i]);
				}
			}
			zoomToGeom(districts_temp);
		}
		//Undo row-chart filters (which are transfered to the map already)
		rowChart.filter(null);
	}
	
	tabularShow = function() {
		chart_show = 'row';
		if (map_filters !== null) {rowChart.filter([map_filters]);} else {rowChart.filter(null);}
		mapChart.filter(null);
		$('#map-chart').hide();
		$('#mapPopup').hide();
		document.getElementById('row-chart-container').style.visibility = 'visible';
		$('#row-chart-container').show();
		//$('#table-chart').show();
	}
	
	
};

