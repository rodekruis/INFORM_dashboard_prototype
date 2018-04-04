
//////////////////////
// DEFINE VARIABLES //
//////////////////////

var setting = 'prototype'; //'prototype','api'
var active_workflow_groups = [
	"INFORM2017"
	, "INFORM_EAST_AFRICA"
	, "INFORM_GTM"
	, "INFORM_LAC"
	, "INFORM_LBN"
	, "INFORM_SAHEL"
	, "INFORM2015"
	, "INFORM2015Mid"
	, "INFORM2016"
	, "INFORM2017Mid"
	, "INFORM2018"			//Added manually
	//, "INFORM_CCA"		//NOT in API yet
	//, "INFORM_COL"		//NOT in API yet
	];
var inform_model = 'INFORM2017';
var workflow_id = 261;
var inform_levels = 7;
var metric = 'INFORM';
var groups = ['INFORM','HA','VU','CC','HA.HUM','HA.NAT','VU.SEV','VU.VGR','CC.INF','CC.INS'];
var color_systems = ['INFORM','INFORM_EAST_AFRICA','INFORM_SAHEL'];
var chart_show = 'map';
var map_filters = [];
var row_filters = [];
var map;

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

var first_load = true;
load_dashboard = function(inform_model,workflow_id) {

	spinner_start();

	$('#map-chart').show();
	chart_show = 'map';

	//RESET (after switching models)
	metric = 'INFORM';
	document.getElementById('metric_label').firstChild.innerHTML = 'INFORM Risk Index';
	document.getElementById('indicator-button').style.backgroundColor = '#951301';
	document.getElementById('area_selection').style.color = '#951301';
	document.getElementsByClassName('reset-button')[0].style.backgroundColor = '#951301';
	document.getElementsByClassName('reset-button')[0].style.visibility = 'hidden';
	for (var i=0;i<$('.collapse.in').length;i++){ $('.collapse.in')[i].classList.remove('in');};
	$('.dropdown-submenu a.models1').next('ul').css('display','none');
	$('.dropdown-submenu a.models2').next('ul').css('display','none');

	//Determine if a parameter-specific URL was entered, and IF SO, set the desired parameters
	var url = location.href;
	if (url.indexOf('?') > -1) {
		url = url.split('?')[1];
		directURLload = true;
		inform_model = url.split('&')[0].split('=')[1];
		workflow_id = url.split('&')[1].split('=')[1];
		metric = url.split('&')[2].split('=')[1];
		chart_show = url.split('&')[3].split('=')[1];
		//map_filters = url.split('&')[4].split('=')[1].split(',');
		//console.log(map_filters);
		window.history.pushState({}, document.title, setting == 'api' ? 'http://localhost:8082' : 'https://rodekruis.github.io/INFORM_dashboard_prototype/' );
	} else {
		directURLload = false;
	}

	//Load data
	//Empty data-object
	d = {};
	d.inform_model = inform_model;
	d.workflow_id = workflow_id;

	var workflow_api = 'http://www.inform-index.org/API/InformAPI/workflows/GetByWorkflowGroup/' + inform_model;

	//TEMPORARY
	if (inform_model.indexOf('_') > -1) {var workflow_string = inform_model.replace('INFORM','');} else {var workflow_string = '';};
	d3.json(setting == 'api' ? workflow_api : 'data/workflow' + workflow_string + '.json',function(workflow_info) {
        d.workflow_info = workflow_info;                                
		d.system = workflow_info[0].System.toUpperCase();
		if (d.system == 'INFORM') { country_code = 'INFORM'; } else { country_code = inform_model.replace('INFORM_',''); };

		var source_api = 'http://www.inform-index.org/API/InformAPI/Indicators/Index/';
		d3.json(setting == 'api' ? source_api : 'data/sourcedata.json',function(source_data) {

			//console.log(source_data);
			d.source_data = source_data;

			//Get links for data and metadata
			var url_meta = 'http://www.inform-index.org/API/InformAPI/Processes/GetByWorkflowId/' + workflow_id;

			// Load INFORM metadata
			d3.json(setting == 'api' ? url_meta : 'data/metadata_' + country_code + '.json', function(meta_data) {
				d.Metadata_full = meta_data;
				d.Metadata = meta_data;
//				d.Metadata = $.grep(meta_data, function(e){ return e.VisibilityLevel <= 99 && e.VisibilityLevel <= inform_levels });
				inform_indicators = [];
				for (i=0;i<d.Metadata.length;i++) { inform_indicators.push(d.Metadata[i].OutputIndicatorName); }


				//API-link with all needed indicators
				//var url_data = 'http://www.inform-index.org/API/InformAPI/countries/Scores/?WorkflowId=' + workflow_id + '&IndicatorId=' + inform_indicators.toString();
				var url_data = 'http://www.inform-index.org/API/InformAPI/countries/Scores/?WorkflowId=' + workflow_id;

				//Load INFORM data
				d3.json(setting == 'api' ? url_data : 'data/inform_data_' + country_code + '.json', function(inform_data){
					//d.inform_data = inform_data;
					d.inform_data = $.grep(inform_data, function(e){ return inform_indicators.indexOf(e.IndicatorId) > -1;});

					//Load Geodata
					var url_geo = 'http://www.inform-index.org/API/InformAPI/Countries/GeometryLocation/?modelName=' + d.system;
					geo_data_url = 'countries_' + country_code;
					if (workflow_id == 355) {geo_data_url = 'countries_SAHEL_02';};
					//d3.json(url_geo, function (url) { d3.json(url,function(geo_data) {
					d3.json('data/' + geo_data_url + '.json', function (geo_data) {
						//console.log(geo_data);
						d.Districts = topojson.feature(geo_data,geo_data.objects[geo_data_url]);
						d.Districts.features = $.grep(d.Districts.features,function(e){ return ['ATA','GRL'].indexOf(e.properties.id) <= -1 ;});

						//Load color-data (TO DO: to be replaced by API-call)
						if (color_systems.indexOf(d.system) <= -1) { color_model = 'INFORM'; } else {color_model = d.system;};
						d3.dsv(';')("data/colors.csv", function(color_data){
							d.Colors = $.grep(color_data, function(e){ return e.System == color_model });


							//Print data to screen
							console.log(d);

							// generate the actual content of the dashboard
							generateCharts(d);

							spinner_stop();

							//Check if browser is IE (L_PREFER_CANVAS is a result from an earlier IE-check in layout.server.view.html)
							if (typeof L_PREFER_CANVAS !== 'undefined' && first_load == true) {
								$('#IEmodal').modal('show');
							}
                            first_load = false;

						});
					});
					//});
				});
			});


		});


	});






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
			lookup[e.properties.id] = String(e.properties[field]);
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
	var genLookup_data = function (d,field){
		var lookup_data = {};
		d.inform_data.forEach(function(e){
			lookup_data[e.IndicatorId] = String(e[field]);
		});
		return lookup_data;
	};
	//fill the lookup table with the metadata-information per variable
	var genLookup_metafull = function (field){
		var test = {};
		d.Metadata_full.forEach(function(e){
			test[e.OutputIndicatorName] = String(e[field]);
		});
		return test;
	};


	//////////////////////////
	// SETUP META VARIABLES //
	//////////////////////////


	// get the lookup tables
	var lookup = genLookup('name');
	var meta_label = genLookup_meta(d,'Fullname');
	var meta_level = genLookup_meta(d,'VisibilityLevel');
	metric_label = meta_label[metric];
	document.getElementById('metric_label').firstChild.innerHTML = metric_label;

	//Define number formats for absolute numbers and for percentage metrics
	var dec1Format = d3.format(',.1f');
	// var currentFormat = function(value) {
		// return dec1Format(value);
	// };


	////////////////////
	// METADATA SETUP //
	////////////////////

	var lookup_metafull_id = genLookup_metafull('IndicatorId');

	var children = [];
	for (var i=0; i < d.Metadata_full.length; i++) {

		var record = {};
		if (d.Metadata_full[i].OutputIndicatorName !== 'POP' && d.Metadata_full[i].OutputIndicatorName !== 'POP_DEN') {// && d.Metadata_full[i].StepNumber == 0) {
			record.stepnr = d.Metadata_full[i].StepNumber;
			record.vis_level = d.Metadata_full[i].VisibilityLevel;
			record.name = d.Metadata_full[i].OutputIndicatorName;
			record.parent1 = d.Metadata_full[i].Parent;
			children.push(record);
		}
	};

	//fill the lookup table with the metadata-information per variable
	var genLookup_children = function (field){
		var test = {};
		children.forEach(function(e){
			test[e.name] = String(e[field]);
		});
		return test;
	};
	var lookup_children_parent = genLookup_children('parent1');
	var lookup_children_vis_level = genLookup_children('vis_level');

	for (var i=0;i<children.length;i++) {


		children[i].parent2 = lookup_children_parent[children[i].parent1] == 'null' ? undefined : lookup_children_parent[children[i].parent1];
		children[i].parent3 = lookup_children_parent[children[i].parent2] == 'null' ? undefined : lookup_children_parent[children[i].parent2];
		children[i].parent4 = lookup_children_parent[children[i].parent3] == 'null' ? undefined : lookup_children_parent[children[i].parent3];
		children[i].parent5 = lookup_children_parent[children[i].parent4] == 'null' ? undefined : lookup_children_parent[children[i].parent4];
		children[i].parent6 = lookup_children_parent[children[i].parent5] == 'null' ? undefined : lookup_children_parent[children[i].parent5];
		children[i].parent7 = lookup_children_parent[children[i].parent6] == 'null' ? undefined : lookup_children_parent[children[i].parent6];
		children[i].parent8 = lookup_children_parent[children[i].parent7] == 'null' ? undefined : lookup_children_parent[children[i].parent7];
		children[i].parent9 = lookup_children_parent[children[i].parent8] == 'null' ? undefined : lookup_children_parent[children[i].parent8];
		children[i].parent10 = lookup_children_parent[children[i].parent9] == 'null' ? undefined : lookup_children_parent[children[i].parent9];

		children[i].parent1 = lookup_children_vis_level[children[i].parent1] > 99 ? lookup_children_parent[children[i].parent1] : children[i].parent1;
		children[i].parent2 = lookup_children_vis_level[children[i].parent2] > 99 ? lookup_children_parent[children[i].parent2] : children[i].parent2;
		children[i].parent3 = lookup_children_vis_level[children[i].parent3] > 99 ? lookup_children_parent[children[i].parent3] : children[i].parent3;
		children[i].parent4 = lookup_children_vis_level[children[i].parent4] > 99 ? lookup_children_parent[children[i].parent4] : children[i].parent4;
		children[i].parent5 = lookup_children_vis_level[children[i].parent5] > 99 ? lookup_children_parent[children[i].parent5] : children[i].parent5;
		children[i].parent6 = lookup_children_vis_level[children[i].parent6] > 99 ? lookup_children_parent[children[i].parent6] : children[i].parent6;
		children[i].parent7 = lookup_children_vis_level[children[i].parent7] > 99 ? lookup_children_parent[children[i].parent7] : children[i].parent7;
		children[i].parent8 = lookup_children_vis_level[children[i].parent8] > 99 ? lookup_children_parent[children[i].parent8] : children[i].parent8;
		children[i].parent9 = lookup_children_vis_level[children[i].parent9] > 99 ? lookup_children_parent[children[i].parent9] : children[i].parent9;
		children[i].parent10 = lookup_children_vis_level[children[i].parent10] > 99 ? lookup_children_parent[children[i].parent10] : children[i].parent10;

		children[i].parents = children[i].name + ',' + (children[i].parent1 ? children[i].parent1 + ',' : '') + (children[i].parent2 ? children[i].parent2 + ',' : '') + (children[i].parent3 ? children[i].parent3 + ',' : '') + (children[i].parent4 ? children[i].parent4 + ',' : '') + (children[i].parent5 ? children[i].parent5 + ',' : '')
									 + (children[i].parent6 ? children[i].parent6 + ',' : '') + (children[i].parent7 ? children[i].parent7 + ',' : '') + (children[i].parent8 ? children[i].parent8 + ',' : '') + (children[i].parent9 ? children[i].parent9 + ',' : '') + (children[i].parent10 ? children[i].parent10 + ',' : '');
		children[i].parents = children[i].parents.split(',');
		if (children[i].parents.indexOf('') > -1) { children[i].parents.splice(children[i].parents.indexOf(''), 1); };
		children[i].parents = children[i].parents.filter(function(item, i, ar){ return ar.indexOf(item) === i; });

		children[i].levels = children[i].parents.length;
		for (k=0;k<d.source_data.length;k++) {
			if (children[i].name == d.source_data[k].IndicatorId || lookup_metafull_id[children[i].name] == d.source_data[k].IndicatorId) {
				children[i].indicator = d.source_data[k].IndicatorId;
				children[i].indicator_label = d.source_data[k].IndicatorDescription;
				children[i].provider = d.source_data[k].Provider;
				children[i].link = d.source_data[k].Link;
				children[i].description = d.source_data[k].IndicatorNote;
			}
		}

	}
	//console.log(children);

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
		if (ind_max <=10 							//Obvious
			&& (ind_min >= 0 || ind_min == -99) 	// > 0 is obvious. ==-99 is a code that occurs
			&& ind_max > 1.1						//This is to rule out 0-1 indicators (such as HDI or percentages)
			&& (record_temp.Parent || record_temp.OutputIndicatorName == 'INFORM')
			&& record_temp.VisibilityLevel < 99
			) {
			record.name = record_temp.OutputIndicatorName;
			record.lowest_level = 0;
			if (record.name.indexOf('SS1') > -1 || record.name.indexOf('SS3') > -1) {record.level = record.level + 1;};
			record.children = record_temp.Children ? record_temp.Children.split(',') : [];


			for (m=0;m<children.length;m++){
				if (children[m].parents.indexOf(record_temp.OutputIndicatorName) > -1) {
					record.level = children[m].levels - children[m].parents.indexOf(record_temp.OutputIndicatorName) - 1;
					record.group = children[m].parents[children[m].parents.indexOf(record_temp.OutputIndicatorName) + 1];
					break;
				}
			};

			//record.level = record_temp.VisibilityLevel;
			//if (record.children == 'HA.NAT-TEMP') {record.children = ['HA.NAT.EQ','HA.NAT.TS','HA.NAT.FL','HA.NAT.TC','HA.NAT.DR'];}
			//record.group = !record_temp.Parent ? null : record_temp.Parent.replace('-TEMP','').replace('_AVG',''); // == 'HA.NAT-TEMP' ? 'HA.NAT' : record_temp.Parent; //record_temp.OutputIndicatorName.substring(0,record_temp.OutputIndicatorName.lastIndexOf('.'));
			//record.group = record_temp.Parent;
			tables.push(record);
		} else { // USE THIS FOR inspection of possibly weird variables
			//console.log(record_temp.OutputIndicatorName);
			// console.log(ind_max);
			// console.log(ind_min);
		}

	}
	//console.log(tables);

	// For each selected indicator ..
	tables.forEach(function(t) {
		t.indicator = [];
		t.indicator_label = [];
		t.provider = [];
		t.link = [];
		t.description = [];
		// if no children: this is a lowest-level indicator
		if (t.children.length == 0) {t.lowest_level = 1;};
		// .. and for each child of that indicator
		var match = 0;
		var match2 = 0;
		for (i=0;i<t.children.length;i++) {
			for (j=0;j<tables.length;j++) {
				// .. look up if the child is also in Tables-object (if so: it is not a lowest-level indicator)
				if (t.children[i] == tables[j].name) {
					//console.log(t.children[i]);
					match = 1;
				};
			};
			// .. if no match, this is a lowest-level indicator
			if (match == 0) {
				t.lowest_level = 1;

				//Now search in the previously-made children array for the child-indicator, if found take the metadat-info from it
				for (m=0;m<children.length;m++){
					if (children[m].parents.indexOf(t.children[i]) > -1 && children[m].indicator) {
						//console.log(children[m]);
						if (t.indicator.indexOf(children[m].indicator) <= -1) {
							t.indicator.push(children[m].indicator);
							t.indicator_label.push(children[m].indicator_label);
							t.provider.push(children[m].provider);
							t.link.push(children[m].link);
							t.description.push(children[m].description);
						}
						match2 = 1;
					}
				}
			};
		};
		if (match2 == 0) {
			for (m=0;m<children.length;m++){
				if (children[m].parents.indexOf(t.name) > -1 && children[m].indicator) {
					//console.log(children[m]);
					if (t.indicator.indexOf(children[m].indicator) <= -1) {
						t.indicator.push(children[m].indicator);
						t.indicator_label.push(children[m].indicator_label);
						t.provider.push(children[m].provider);
						t.link.push(children[m].link);
						t.description.push(children[m].description);
					}
				}
			}
		}
	});
	//console.log(tables);

	tables.forEach(function(t) {
		if (t.lowest_level == 1 && t.indicator.length == 0) {
			//console.log(t);
		}
	});

	//fill the lookup table with the metadata-information per variable
	var genLookup_tables = function (field){
		var test = {};
		tables.forEach(function(e){
			test[e.name] = e[field];
		});
		return test;
	};
	var lookup_indicator = genLookup_tables('indicator');
	var lookup_indicator_label = genLookup_tables('indicator_label');
	var lookup_provider = genLookup_tables('provider');
	var lookup_link = genLookup_tables('link');
	var lookup_description = genLookup_tables('description');


	////////////////
	// DATA SETUP //
	////////////////

	//First PIVOT the INFORM data from row*indicator level to row level (with indicators als columns)
	var grouped = [];
	d.inform_data.forEach(function (a) {
		if (!this[a.Iso3]) {
			this[a.Iso3] = { pcode: a.Iso3, values: [] };
			grouped.push(this[a.Iso3]);
		}
		this[a.Iso3].values.push({ IndicatorId: a.IndicatorId, IndicatorScore: a.IndicatorScore });
	}, Object.create(null)); // Object.create creates an empty object without prototypes
	//console.log(grouped);

	var data_final = [];
	for (var i=0; i < grouped.length; i++) {
		var record = {};
		var record_temp = grouped[i];
		record.pcode = record_temp.pcode;
		record.name = lookup[record_temp.pcode] ? lookup[record_temp.pcode] : '';
		for (var j=0; j < tables.length; j++) {
			count=0;
			for (var k=0;k<record_temp.values.length;k++) {
				var record_temp2 = record_temp.values[k];
				if (tables[j].name == record_temp2.IndicatorId) {
					record[tables[j].name] = record_temp2.IndicatorScore == 0 ? '0.01' : String(record_temp2.IndicatorScore);
					count=1;
				}
			}
			if (count==0) {record[tables[j].name] = '';}

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
	var whereGroupSum_tab = whereDimension_tab.group().reduceSum(function(d) {return d[metric];});
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
	mapchartColors_func = function(metric) {
		var color_group = metric.split('.')[0].concat((metric.split('.')[1]) ? '.'.concat(metric.split('.')[1]) : '');
		if (groups.indexOf(color_group) <= -1) {
			color_group = color_group.split('.')[0];
		}
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
	mapchartColors = mapchartColors_func(metric);
	document.getElementById('indicator-button').style.backgroundColor = color_range[3].HEX;
	document.getElementsByClassName('reset-button')[0].style.backgroundColor = color_range[3].HEX;
	document.getElementById('area_selection').style.color = color_range[3].HEX;

	color_cat = function(ind) {

		var width = keyvalue[ind];
		var color_group = ind.split('.')[0].concat((ind.split('.')[1]) ? '.'.concat(ind.split('.')[1]) : '');
		if (groups.indexOf(color_group) <= -1) {
			color_group = color_group.split('.')[0];
		}
		//if (color_group == 'HDI-Est') {color_group = 'VU.SEV';}
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
			risk_score.textContent = '';
			risk_score.setAttribute('class','component-score');
			risk_score.setAttribute('style','border:none');
		}
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		if (vulnerability_score) {
			vulnerability_score.textContent = '';
			vulnerability_score.setAttribute('class','component-score');
			vulnerability_score.setAttribute('style','border:none');
		}
		var hazard_score = document.getElementById('hazard_score_main');
		if (hazard_score) {
			hazard_score.textContent = '';
			hazard_score.setAttribute('class','component-score');
			hazard_score.setAttribute('style','border:none');
		}
		var coping_score = document.getElementById('coping_capacity_score_main');
		if (coping_score) {
			coping_score.textContent = '';
			coping_score.setAttribute('class','component-score');
			coping_score.setAttribute('style','border:none');
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

			if (groups.indexOf(record.name.substring(0,6)) > -1) {
				icon = 'img/' + record.name.substring(0,6) + '.png';
			} else {
				icon = 'img/' + record.name.substring(0,2) + '.png';
			}

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
				div0.setAttribute('class','col-md-2 col-sm-2 col-xs-2');
				div.appendChild(div0);
				var img1 = document.createElement('img');
				img1.setAttribute('style','height:20px');
				img1.setAttribute('src',icon);
				div0.appendChild(img1);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col-md-4 col-sm-4 col-xs-4 component-label');
				div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				div.appendChild(div1);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5 col-sm-5 col-xs-5 bar-container');
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
				div3.setAttribute('class','col-md-1 col-sm-1 col-xs-1 no-padding');
				div.appendChild(div3);
				var button = document.createElement('button');
				button.setAttribute('type','button');
				button.setAttribute('class','btn-modal');
				button.setAttribute('data-toggle','modal');
				button.setAttribute('onclick','info(\'' + record.name + '\')');
				div3.appendChild(button);
				// var img3 = document.createElement('img');
				// img3.setAttribute('src','img/icon-popup.svg');
				// img3.setAttribute('style','height:17px;margin-bottom:3px;');
				// button.appendChild(img3);

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
				//console.log(record);
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
					div1.setAttribute('class','col-md-6 col-sm-6 col-xs-6  component-label');
					div1.setAttribute('style','padding-left: 5px');
					div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
					div1.innerHTML = meta_label[record.name];
					//$compile(div1)($scope);
					div.appendChild(div1);
					var div2 = document.createElement('div');
					div2.setAttribute('class','col-md-5 col-sm-5 col-xs-5 bar-container');
					div.appendChild(div2);
					var div1a = document.createElement('div');
					div1a.setAttribute('class','component-score-small');
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
					div3.setAttribute('class','col-md-1 col-sm-1 col-xs-1 no-padding');
					div.appendChild(div3);
					if (record.lowest_level == 1) {
                        var button = document.createElement('button');
                        button.setAttribute('type','button');
                        button.setAttribute('class','btn-modal');
                        button.setAttribute('data-toggle','modal');
                        button.setAttribute('onclick','info(\'' + record.name + '\')');
                        div3.appendChild(button);
                        var div3a = document.createElement('div');
                        div3a.setAttribute('style','height:17px;width:auto');
                        button.appendChild(div3a);
						var img3 = document.createElement('img');
						img3.setAttribute('src','img/icon-popup.svg');
						img3.setAttribute('style','height:100%');
						div3a.appendChild(img3);
					}
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

		//console.log(filters);
		var data_area = data_final.filter(function(obj) { return filters[0] == obj.pcode; });
		keyvalue = [];
		tables.forEach(function(t) {
			var key = t.name;
			//keyvalue[key] = dec1Format(data_area[0][key]);
			keyvalue[key] = data_area[0][key];
		});
		return keyvalue;

	};

	var mapfilters_length = 0;
	var rowfilters_length = 0;
	var updateHTML = function(filters) { //,keyvalue2) {

		//console.log(keyvalue);
		var risk_score = document.getElementById('risk_score_main');
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		var hazard_score = document.getElementById('hazard_score_main');
		var coping_score = document.getElementById('coping_capacity_score_main');
		if (filters.length == 1) {
			keyvalue = keyvalues1(filters);

			if (risk_score) {
				risk_score.textContent = dec1Format(keyvalue.INFORM);
				risk_score.setAttribute('style','border:solid; border-width:1px; border-color:grey');
			}
			if (vulnerability_score) {
				vulnerability_score.textContent = dec1Format(keyvalue.VU);
				vulnerability_score.setAttribute('style','border:solid; border-width:1px; border-color:grey');
			}
			if (hazard_score) {
				hazard_score.textContent = dec1Format(keyvalue.HA);
				hazard_score.setAttribute('style','border:solid; border-width:1px; border-color:grey');
			}
			if (coping_score) {
				coping_score.textContent = dec1Format(keyvalue.CC);
				coping_score.setAttribute('style','border:solid; border-width:1px; border-color:grey');
			}
			for (var i=0;i<$('.component-scale').length;i++){ $('.component-scale')[i].style.background = '#e2e7ee'; };


		} else {
			if (risk_score) {
				risk_score.textContent = '';
				risk_score.setAttribute('style','border:none');
			}
			if (vulnerability_score) {
				vulnerability_score.textContent = null;
				vulnerability_score.setAttribute('style','border:none');
			}
			if (hazard_score) {
				hazard_score.textContent = null;
				hazard_score.setAttribute('style','border:none');
			}
			if (coping_score) {
				coping_score.textContent = null;
				coping_score.setAttribute('style','border:none');
			}
			for (var i=0;i<$('.component-scale').length;i++){ $('.component-scale')[i].style.background = 'transparent'; };
		};

		for (var i=0;i<tables.length;i++) {
			var record = tables[i];

			if (record.level >= 2) {

				if (filters.length == 1) {

					var width = keyvalue[record.name]*10;
					var div1a = document.getElementById(record.name);
					div1a.setAttribute('class','component-score-small');
					div1a.setAttribute('style','border:solid; border-width:1px; border-color:black');

					div1a.innerHTML = !keyvalue[record.name] ? '-' : (keyvalue[record.name] == 10 ? '10' : dec1Format(keyvalue[record.name]));
					var div2a1 = document.getElementById('bar-'+record.name);
					div2a1.setAttribute('class','score-bar ');
					div2a1.setAttribute('style','width:'+ width + '%; background:' + color_cat(record.name));

				} else {

					var div1a = document.getElementById(record.name);
					div1a.innerHTML = '';
					div1a.setAttribute('style','border:none');
					var div2a1 = document.getElementById('bar-'+record.name);
					div2a1.setAttribute('class','score-bar ');
					div2a1.setAttribute('style','width:0%');


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



	/////////////////////
	// MAP CHART SETUP //
	/////////////////////

	$(document).keydown(function(event){
		if(event.which=="17")
			cntrlIsPressed = true;
	});
	$(document).keyup(function(){
		cntrlIsPressed = false;
	});
	var cntrlIsPressed = false;
	var click_filter = true;
	var coming_from_map = false;
	var coming_from_tab = false;

	//Set up the map itself with all its properties
	mapChart
		.width($('#map-chart').width())
		.height(800)
		.dimension(whereDimension)
		.group(whereGroupSum)
		.center([0,0])
		.zoom(0)
		.geojson(d.Districts)
		.colors(mapchartColors)
		.colorCalculator(function(e){
			if (meta_level[metric] > 3 || color_systems.indexOf(d.system) <= -1){
				if (!e) {return '#cccccc';} else {return mapChart.colors()(e);}
			} else {
				if (!e) {return '#cccccc';}
				else if (e<=color_range[0].threshold) {return color_range[0].HEX;}
				else if (e<=color_range[1].threshold) {return color_range[1].HEX;}
				else if (e<=color_range[2].threshold) {return color_range[2].HEX;}
				else if (e<=color_range[3].threshold) {return color_range[3].HEX;}
				else if (e<=color_range[4].threshold) {return color_range[4].HEX;}
			}
		})
		.featureKeyAccessor(function(feature){
			return feature.properties.id;
		})
		.popup(function(d){
			return lookup[d.key].concat(' - ',meta_label[metric],': ',isNaN(d.value) ? 'No Data' : dec1Format(d.value));
		})
		.renderPopup(true)
		.turnOnControls(true)
		.legend(dc.leafletLegend().position('topright'))

		//Set up what happens when clicking on the map (popup appearing mainly)
		.on('filtered',function(chart,filters){
            if (cntrlIsPressed) {
				for (i=0;i<row_filters_old.length;i++){ if (chart.filters().indexOf(row_filters_old[i]) <= -1) { chart.filters().push(row_filters_old[i]); }; };
			}
			if(!cntrlIsPressed && click_filter) {
				while (chart.filters().length > 1) {chart.filters().shift();}
			}
			map_filters = $.extend( [], chart.filters() );
            mapfilters_length = map_filters.length;
			if (chart_show == 'map' && coming_from_tab) {
				for (var i=0;i<$('.filter-count').length;i++){
					if (row_filters_old.length == 1) {$('.filter-count')[i].innerHTML = lookup[row_filters_old[0]];}
					else if (row_filters_old.length > 1) { $('.filter-count')[i].innerHTML = row_filters_old.length; }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};
				updateHTML(row_filters_old);
				var resetbutton = document.getElementsByClassName('reset-button')[0];
				if (row_filters_old.length > 0) { resetbutton.style.visibility = 'visible';
				} else { resetbutton.style.visibility = 'hidden'; }
			}
			if (chart_show == 'map' && !coming_from_tab) {
				for (var i=0;i<$('.filter-count').length;i++){
					if (map_filters.length == 1) {$('.filter-count')[i].innerHTML = lookup[map_filters[0]];}
					else if (map_filters.length > 1) { $('.filter-count')[i].innerHTML = map_filters.length; }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};
				updateHTML(map_filters);
				var resetbutton = document.getElementsByClassName('reset-button')[0];
				if (map_filters.length > 0) { resetbutton.style.visibility = 'visible';
				} else { resetbutton.style.visibility = 'hidden'; }
			}
		})
	;



	/////////////////////
	// ROW CHART SETUP //
	/////////////////////
    
    if($(window).width() < 768) {
        var rowChart_width = $('#tabular-wrapper').width();
    } else {
        var rowChart_width = $('#row-chart-container').width() - 370;
    }
    console.log(rowChart_width);
    barheight = 20;
	var row_filters_old = [];
	rowChart
        .width(rowChart_width)
		.height((barheight + 5) * data_final.length + 50)
		.dimension(whereDimension_tab)
		.group(whereGroupSum_tab)
		.ordering(function(d) {return isNaN(d.value) ? 0 : -d.value; })
		.fixedBarHeight(barheight)
		.valueAccessor(function(d){ return isNaN(d.value) ? 0 : d.value; })
		.colors(mapchartColors)
		.colorCalculator(function(e){
			if (meta_level[metric] > 3 || color_systems.indexOf(d.system) <= -1){
				if (!e) {return '#cccccc';} else {return mapChart.colors()(e.value);}
			} else {
				if (!e) {return '#cccccc';}
				else if (e.value<=color_range[0].threshold) {return color_range[0].HEX;}
				else if (e.value<=color_range[1].threshold) {return color_range[1].HEX;}
				else if (e.value<=color_range[2].threshold) {return color_range[2].HEX;}
				else if (e.value<=color_range[3].threshold) {return color_range[3].HEX;}
				else if (e.value<=color_range[4].threshold) {return color_range[4].HEX;}
			}
		})
		.label(function(d) {
			if (d.value == 0) {return '';} else {
				return lookup[d.key] ? (isNaN(d.value) ? "No Data" : dec1Format(d.value)).concat(' - ',lookup[d.key]) : dec1Format(d.value).concat(' - ',d.key);
			}
		})
		.title(function(d) {
			return lookup[d.key] ? (isNaN(d.value) ? "No Data" : dec1Format(d.value)).concat(' - ',lookup[d.key]) : dec1Format(d.value).concat(' - ',d.key);
		})
		.on('filtered',function(chart,filters){
			if(!cntrlIsPressed && click_filter) {
				while (chart.filters().length > 1) {chart.filters().shift();}
			}
			row_filters = $.extend( [], chart.filters() );
			rowfilters_length = row_filters.length;
			if (chart_show == 'row' && coming_from_map) {
				for (var i=0;i<$('.filter-count').length;i++){
					if (map_filters_old.length == 1) { $('.filter-count')[i].innerHTML = lookup[map_filters_old[0]]; }
					else if (map_filters_old.length > 1) { $('.filter-count')[i].innerHTML = map_filters_old.length; }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};
				updateHTML(map_filters_old);
				var resetbutton = document.getElementsByClassName('reset-button')[0];
				if (map_filters_old.length > 0) { resetbutton.style.visibility = 'visible'; } else { resetbutton.style.visibility = 'hidden'; }
			}
			if (chart_show == 'row'  && !coming_from_map) {
				for (var i=0;i<$('.filter-count').length;i++){
					if (row_filters.length == 1  || row_filters_old.length == 1) { $('.filter-count')[i].innerHTML = rowfilters_length == 0 ? lookup[row_filters_old[0]] : lookup[row_filters[0]]; }
					else if (row_filters.length > 1 || row_filters_old.length > 1) { $('.filter-count')[i].innerHTML = Math.max(row_filters.length,row_filters_old.length); }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};
				rowfilters_length == 0 ? updateHTML(row_filters_old) : updateHTML(row_filters);
				var resetbutton = document.getElementsByClassName('reset-button')[0];
				if (row_filters.length > 0 || row_filters_old.length > 0) { resetbutton.style.visibility = 'visible'; } else { resetbutton.style.visibility = 'hidden'; }
			}
		})
		.on('renderlet',function(chart,filters){
			row_text(color_range);
		})
		.elasticX(false)
		.x(d3.scale.linear().range([0,(rowChart.width())]).domain([0,11]))
		.xAxis().scale(rowChart.x()).tickValues([])
		;
    
	row_text = function(color_range) {
        var color_level;
		for (var i=0;i<$('.dc-chart g.row').length;i++){
            row = $('.dc-chart g.row')[i];
            fill = row.getElementsByTagName('rect')[0].getAttribute('fill');
			selection = row.getElementsByTagName('rect')[0].getAttribute('class');
			if (fill) {
				for (j=0;j<color_range.length;j++){
                    if (fill.toString().toLowerCase() == color_range[j].HEX.toLowerCase()) { color_level = j; break};
                    
				};
			}
			text = row.getElementsByTagName('text')[0];
			if (color_level <= 2 || selection == 'deselected' || !fill) { text.style.fill = 'black'; } else { text.style.fill = 'white';};
		}
	}

	sort = function(type) {
		if (type === 'value') {
			rowChart.ordering(function(d) {return isNaN(d.value) ? 0 : -d.value; });
		} else if (type == 'name') {
			rowChart.ordering(function(d) {if (d.value == 0) {return 'zzz';} else {return lookup[d.key];};});
		}
		rowChart.redraw();
		row_text(color_range);
	};
    
    scrollRowChart = function() {
        //setTimeout( function() {
            $('#tabular-wrapper').scrollTop(0);
            //$('body').scrollTop(0);
        //}, 500 );
    };


	///////////////////////////////
	// SIDEBAR: INDICATOR CHANGE //
	///////////////////////////////

	map_coloring = function(id) {

		metric = id;
		metric_label = meta_label[id];
		mapchartColors = mapchartColors_func(metric);
		whereGroupSum.dispose();
		whereGroupSum = whereDimension.group().reduceSum(function(d) { if (d[metric]) {return d[metric];};});
		whereGroupSum_tab.dispose();
		whereGroupSum_tab = whereDimension_tab.group().reduceSum(function(d) { if (d[metric]) {return d[metric];};});
		mapChart
			.group(whereGroupSum)
			.colors(mapchartColors)
			.colorCalculator(function(e){
				if (meta_level[metric] > 3 || color_systems.indexOf(d.system) <= -1){
					if (!e) {return '#cccccc';} else {return mapChart.colors()(e);}
				} else {
					if (!e) {return '#cccccc';}
					else if (e<=color_range[0].threshold) {return color_range[0].HEX;}
					else if (e<=color_range[1].threshold) {return color_range[1].HEX;}
					else if (e<=color_range[2].threshold) {return color_range[2].HEX;}
					else if (e<=color_range[3].threshold) {return color_range[3].HEX;}
					else if (e<=color_range[4].threshold) {return color_range[4].HEX;}
				}
			})
		;
		rowChart
			.group(whereGroupSum_tab)
			.colors(mapchartColors)
			.colorCalculator(function(e){
				if (meta_level[metric] > 3 || color_systems.indexOf(d.system) <= -1){
					if (!e) {return '#cccccc';} else {return mapChart.colors()(e.value);}
				} else {
					if (!e) {return '#cccccc';}
					else if (e.value<=color_range[0].threshold) {return color_range[0].HEX;}
					else if (e.value<=color_range[1].threshold) {return color_range[1].HEX;}
					else if (e.value<=color_range[2].threshold) {return color_range[2].HEX;}
					else if (e.value<=color_range[3].threshold) {return color_range[3].HEX;}
					else if (e.value<=color_range[4].threshold) {return color_range[4].HEX;}
				}
			})
		;
		//dc.redrawAll();
        
		if (chart_show == 'row' && row_filters.length >= 1 && map_filters_old.length >= 1) {
            row_filters_old = $.extend( [], row_filters);
			click_filter = false;
			//mapChart.filter([row_filters]);
			rowChart.filter([row_filters]);
			click_filter = true;
			rowChart.redraw();
		} else if (chart_show == 'map' && map_filters.length >= 1) {
            map_filters_old = $.extend( [], map_filters);
			click_filter = false;
            mapChart.filter(null);
			mapChart.filter([map_filters_old]);
			click_filter = true;
			mapChart.redraw();
        } else {
			dc.redrawAll();
		}
		row_text(color_range);

		document.getElementById('metric_label').firstChild.innerHTML = metric_label;
		document.getElementById('indicator-button').style.backgroundColor = color_range[3].HEX;

		/* console.log(metric_label.length);
		//while( $('#metric_label div').width() > $('#metric_label').width() ) {
		//if ( $('#metric_label div').width() > $('#metric_label').width() ) {
		$('#metric_label div').css('font-size', '12px');
		if (metric_label.length > 70) {
			//$('#metric_label div').css('font-size', (parseInt(12 - (metric_label.length - 42) / 4) + "px" ));
			$('#metric_label div').css('font-size', (parseInt(7) + "px" ));
		} else if (metric_label.length > 42) {
			//$('#metric_label div').css('font-size', (parseInt(12 - (metric_label.length - 42) / 4) + "px" ));
			$('#metric_label div').css('font-size', (parseInt(10) + "px" ));
		}s */

		document.getElementsByClassName('reset-button')[0].style.backgroundColor = color_range[3].HEX;
		document.getElementById('area_selection').style.color = color_range[3].HEX;
	};

	/////////////////////////////
	// SIDEBAR: METADATA POPUP //
	/////////////////////////////

	//Function to open the modal with information on indicator
	info = function(id) {
		//console.log(id);
		metric = id;
		metric_label = meta_label[metric];
		if (groups.indexOf(metric.substring(0,6)) > -1) {
			metric_icon = 'img/' + metric.substring(0,6) + '.png';
		} else {
			metric_icon = 'img/' + metric.substring(0,2) + '.png';
		}
		document.getElementsByClassName('metric_icon')[0].setAttribute('src',metric_icon);
		for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].firstChild.innerHTML = metric_label; };
		for (var i=0;i<$('.metric_indicator').length;i++){ $('.metric_indicator')[i].innerHTML = ''; };
		for (var i=0;i<$('.metric_provider').length;i++){ $('.metric_provider')[i].innerHTML = ''; };
		for (var i=0;i<$('.metric_source').length;i++){
			$('.metric_source')[i].innerHTML = '';
			$('.metric_source')[i].href = '';
		};
		for (var i=0;i<$('.metric_desc').length;i++){ $('.metric_desc')[i].innerHTML = ''; };
		if (lookup_indicator[metric].length == 0) {
			for (var i=0;i<$('.metric_indicator').length;i++){ $('.metric_indicator')[i].innerHTML = 'No metadata found for this indicator'; };
		}
		else if (lookup_indicator[metric].length == 1) {
			metric_indicator = lookup_indicator_label[metric][0]; //meta_source[metric];
			metric_provider = lookup_provider[metric][0]; //meta_source[metric];
			metric_source = lookup_link[metric][0]; //meta_source[metric];
			metric_desc = lookup_description[metric][0]; //meta_desc[metric];
			for (var i=0;i<$('.metric_indicator').length;i++){ $('.metric_indicator')[i].innerHTML = metric_indicator; };
			for (var i=0;i<$('.metric_provider').length;i++){ $('.metric_provider')[i].innerHTML = metric_provider; };
			for (var i=0;i<$('.metric_source').length;i++){
				$('.metric_source')[i].innerHTML = metric_source;
				$('.metric_source')[i].href = metric_source;
			};
			for (var i=0;i<$('.metric_desc').length;i++){ $('.metric_desc')[i].innerHTML = metric_desc; };
		} else if (lookup_indicator[metric].length > 1) {
			for (var i=0;i<$('.metric_indicator').length;i++){
				for (var j=0;j<lookup_provider[metric].length;j++) {
					$('.metric_indicator')[i].innerHTML += '<li>' + lookup_indicator_label[metric][j] + '</li>';
				};
			}
			for (var i=0;i<$('.metric_provider').length;i++){
				for (var j=0;j<lookup_provider[metric].length;j++) {
					$('.metric_provider')[i].innerHTML += '<li>' + lookup_provider[metric][j] + '</li>';
				};
			}
			for (var i=0;i<$('.metric_source').length;i++){
				for (var j=0;j<lookup_provider[metric].length;j++) {
					$('.metric_source')[i].innerHTML += '<li>' + lookup_link[metric][j] + '</li>';
					$('.metric_source')[i].href = undefined;
				};
			};
			for (var i=0;i<$('.metric_desc').length;i++){
				for (var j=0;j<lookup_provider[metric].length;j++) {
					$('.metric_desc')[i].innerHTML += '<li>' + lookup_description[metric][j] + '</li>';
				};
			};

		}

		$('#infoModal').modal('show');
	};

	////////////////////////////////
	// SIDEBAR: ACCORDION CLOSING //
	////////////////////////////////

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

	///////////////////////////////////
	// SIDEBAR: MAP & TABULAR SWITCH //
	///////////////////////////////////

	//Switch between MAP and TABULAR view
    mapShow = function() {
        
        row_filters_old = $.extend( [], row_filters );
		//Zoom to selected countries in row-chart
		if (row_filters_old.length == 0) {
			zoomToGeom(d.Districts);
		} else {
			var districts_temp = JSON.parse(JSON.stringify(d.Districts));
			districts_temp.features = [];
			for (var i=0;i<d.Districts.features.length;i++){
				if (row_filters_old.indexOf(d.Districts.features[i].properties.id) > -1) {
					districts_temp.features.push(d.Districts.features[i]);
				}
			}
			zoomToGeom(districts_temp);
		}

		if (chart_show == 'row') {
			chart_show = 'map';
			$('#row-chart-container').hide();
			$('#map-chart').show();

			click_filter = false;
			coming_from_tab = true;
			rowChart.filter(null);
			mapChart.filter([row_filters]);
            map_filters = $.extend( [], row_filters_old ); 
            map_filters_old = $.extend( [], row_filters_old ); 
			rowChart.filter(null);
			click_filter = true;
			coming_from_tab = false;
		}



	}

	map_filters_old = [];
	tabularShow = function() {
        
        chart_show = 'row';
		$('#map-chart').hide();
		document.getElementById('row-chart-container').style.visibility = 'visible';
		$('#row-chart-container').show();

		click_filter = false;
		coming_from_map = true;
		map_filters_old = $.extend( [], map_filters );
        row_filters_old = $.extend( [], map_filters );
		rowChart.filter([map_filters]);
		mapChart.filter(null);
		mapChart.filter([map_filters_old]);
		rowChart.redraw();
		click_filter = true;
		coming_from_map = false;
	}
    
    $(document).ready(function () {
        $('.view-buttons button').click(function(e) {

            $('.view-buttons button.active').removeClass('active');
            
            var $this = $(this);
            if (!$this.hasClass('active')) {
                $this.addClass('active');
            }  
            e.preventDefault();
        });
    });
    
	///////////////////////////
	// SIDEBAR: RESET BUTTON //
	///////////////////////////

	reset_function = function() {
		dc.filterAll();
		dc.redrawAll();
		map_filters_old = [];
		row_filters_old = [];
		updateHTML(row_filters_old);
		for (var i=0;i<$('.filter-count').length;i++){ $('.filter-count')[i].innerHTML = 'All '; };
        var resetbutton = document.getElementsByClassName('reset-button')[0];
		resetbutton.style.visibility = 'hidden';
		if (chart_show == 'map') {zoomToGeom(d.Districts);};
		if (chart_show == 'row') {row_text(color_range);};
	}






	//////////////////////////////
	// HEADER FUNCTIONS: EXPORT //
	//////////////////////////////

	//Export to CSV function
	export_csv = function() {

		var content = data_final;
		var finalVal = '';

		for (var i = 0; i < content.length; i++) {
			var value = content[i];
			var key,innerValue,result;
			if (i === 0) {
				for (key in value) {
					if (value.hasOwnProperty(key)) {
						innerValue = meta_label[key] ? meta_label[key] : key;
						result = innerValue.replace(/"/g, '');
						if (result.search(/("|,|\n)/g) >= 0)
							result = '' + result + '';
						if (key !== 'pcode') finalVal += ',';
						finalVal += result;
					}
				}
			finalVal += '\n';
			}

			for (key in value) {
				if (value.hasOwnProperty(key)) {
					innerValue = JSON.stringify(value[key] == 0.01 ? 0 : value[key]);
					result = innerValue.replace(/"/g, '');
					if (result.search(/("|,|\n)/g) >= 0)
						result = '' + result + '';
					if (key !== 'pcode') finalVal += ',';
					finalVal += result;
				}
			}

			finalVal += '\n';
		}

		if (typeof L_PREFER_CANVAS !== 'undefined') {
            var IEwindow = window.open();
            IEwindow.document.write('sep=,\r\n' + finalVal);
            IEwindow.document.execCommand('SaveAs', null,"export.txt");
            IEwindow.document.close();
            IEwindow.close();
        } else {
            var download = document.getElementById('download');
            download.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(finalVal));
            download.setAttribute('download', 'export.csv');
            //download.click();
        }
	};

	//Export to JSON
	export_json = function() {
		var myWindow = window.open('','','_blank');
		myWindow.document.write(JSON.stringify(d.inform_data))
		myWindow.focus();
	}

	//Create parameter-specific URL and show it in popup to copy
	function addParameterToURL(inform_model,workflow_id,metric,chart_show){//,map_filters,row_filters){
		var _url = location.href;
		_url = _url.split('?')[0];
		//_url += (_url.split('?')[1] ? '&':'?') + 'workflowgroup='+inform_model+'&workflow_id='+workflow_id+'&metric='+metric+'&view='+chart_show+'&map_filters='+map_filters+'&row_filters='+row_filters;
		_url += (_url.split('?')[1] ? '&':'?') + 'workflowgroup='+inform_model+'&workflow_id='+workflow_id+'&metric='+metric+'&view='+chart_show;
		console.log(_url);
		document.getElementById('shareable_URL').innerHTML = _url;
		return _url;
	}

	share_URL = function() {
		shareable_URL = addParameterToURL(d.inform_model,d.workflow_id,metric,chart_show);//,map_filters,row_filters);
		$('#URLModal').modal('show');
	}

	//Export to GEOJSON
	link_data = function() {
        
        var url_subnational = 'http://www.inform-index.org/Subnational/';
		if (d.system == 'INFORM'){
			var url = 'http://www.inform-index.org/Results/Global';
		} else if (d.system == 'INFORM_GTM') {
			var url = url_subnational + 'Guatemala';
		} else if (d.system == 'INFORM_EAST_AFRICA') {
			var url = url_subnational + 'Greater-Horn-of-Africa';
		} else if (d.system == 'INFORM_SAHEL') {
			var url = url_subnational + 'Sahel';
		} else if (d.system == 'INFORM_LAC') {
			var url = url_subnational + 'LAC';
		} else if (d.system == 'INFORM_LBN') {
			var url = url_subnational + 'Lebanon';
		} else if (d.system == 'INFORM_CCA') {
			var url = url_subnational + 'Central-Asia-Caucasus';
		} else if (d.system == 'INFORM_COL') {
			var url = url_subnational + 'Colombia';
		} else {
            var url = url_subnational + d.system;
        }
		var excel = document.getElementById('excel');
		excel.setAttribute('href', url);
		//excel.click();
	}
	//http://www.inform-index.org/LinkClick.aspx?fileticket=K9lWe0MOKGQ%3d&tabid=147&portalid=0&mid=583


	//////////////////////////////////
	// HEADER FUNCTIONS: MODEL MENU //
	//////////////////////////////////

	var workflows = 'http://www.inform-index.org/API/InformAPI/Workflows/WorkflowGroups';
	d3.json(setting == 'api' ? workflows : 'data/workflows.json',function(data_workflows) {

		//data_workflows.push('INFORM2018');

		data_workflows.sort(function(a, b){
			if(a < b) return 1;
			if(a > b) return -1;
			return 0;
		});

		var ul = document.getElementById('model-items');
		var ul_global = document.getElementById('global-model-items');
		while (ul_global.childElementCount > 0) { ul_global.removeChild(ul_global.firstChild);};
		while (ul.childElementCount > 1) { ul.removeChild(ul.lastChild);};

		for (var i=0;i<data_workflows.length;i++) {

			if (active_workflow_groups.indexOf(data_workflows[i]) > -1) {
				//console.log(data_workflows[i]);

				var li = document.createElement('li');
				li.setAttribute('class','dropdown-submenu');
				if (data_workflows[i].indexOf('_') > -1) {
					ul.appendChild(li);
					var a = document.createElement('a');
					a.setAttribute('class','dropdown-toggle export-button submenu-item models1');
				} else {
					ul_global.appendChild(li);
					var a = document.createElement('a');
					a.setAttribute('class','dropdown-toggle export-button submenu-item models2');
				}
				a.setAttribute('data-toggle','dropdown');
				a.setAttribute('href','#');
				a.innerHTML = data_workflows[i];
				li.appendChild(a);
				var fa = document.createElement('i');
				fa.setAttribute('class','fa fa-angle-left export-btn-arrow menu-arrow');
				fa.setAttribute('style','float:left');
				a.appendChild(fa);
				eval("var ul" + i +" = document.createElement('ul');");
				eval("ul" + i + ".setAttribute('class','dropdown-menu');");
				eval("li.appendChild(ul" + i + ");");

				var workflow_info = 'http://www.inform-index.org/API/InformAPI/workflows/GetByWorkflowGroup/' + data_workflows[i];
				if (data_workflows[i].indexOf('_') <= -1) {var workflow_string = '';} else {var workflow_string = data_workflows[i].replace('INFORM','');}
                
                //var _this = this;
				(function (_i) {

					d3.json(setting == 'api' ? workflow_info : 'data/workflow' + workflow_string + '.json',function(workflow_info) {
                        
						if (data_workflows[_i] == 'INFORM_SAHEL') {
							object = {};
							object.Author='anonymous';
							object.WorkflowGroupName = 'INFORM_SAHEL';
							object.WorkflowId = 355;
							object.Name = 'INFORM SAHEL Jun 2017 Results';
							workflow_info.push(object);
						}

						// workflow_info.sort(function(a, b){
							// if(a.Name < b.Name) return -1;
							// if(a.Name > b.Name) return 1;
							// return 0;
						// });
                        
						for (var j=0;j<workflow_info.length;j++) {
							if (workflow_info[j].Author == 'anonymous') { // && active_workflow_names.indexOf(workflow_info[j].Name) > -1) {

								var li = document.createElement('li');
								eval("ul" + _i + ".appendChild(li);");
								var a = document.createElement('a');
								a.setAttribute('class','submenu-item');
								a.setAttribute('onClick','load_dashboard(\'' + workflow_info[j].WorkflowGroupName + '\',' + workflow_info[j].WorkflowId + ')');
								a.setAttribute('role','button');
								//a.innerHTML = workflow_info[j].Name.split(' ').slice(0,2).join(' ');
								a.innerHTML = workflow_info[j].Name;
								li.appendChild(a);

							}
						}
					});
				})(i);
			};
		};
		$(document).ready(function(){
		  $('.dropdown-submenu a.models1').on("click", function(e){
			$('.dropdown-submenu a.models1').next('ul').css('display','none');
			$(this).next('ul').toggle();
			e.stopPropagation();
			e.preventDefault();
		  });
		  $('.dropdown-submenu a.models2').on("click", function(e){
			$('.dropdown-submenu a.models2').next('ul').css('display','none');
			$(this).next('ul').toggle();
			e.stopPropagation();
			e.preventDefault();
		  });
		});
	});







	/////////////////////////
	// RENDER MAP AND PAGE //
	/////////////////////////

	//Render all dc-charts and -tables
	dc.renderAll();
	var zoom_child = $('.leaflet-control-zoom')[0];
	var zoom_parent = $('.leaflet-bottom.leaflet-right')[0];
	zoom_parent.insertBefore(zoom_child,zoom_parent.childNodes[0]);
    if($(window).width() < 768) {
        var legend_child = $(".info.legend.leaflet-control")[0];
        var legend_parent = $(".leaflet-bottom.leaflet-right")[0];
        legend_parent.insertBefore(legend_child,legend_parent.childNodes[0]);
    }
    row_text(color_range);

	// cntrlIsPressed = true;
	// map_filters_old = map_filters;
	// mapChart.filter([map_filters]);
	// rowChart.filter([map_filters]);
	// cntrlIsPressed = false;

	map = mapChart.map();
	//mapChart.redraw();
	function zoomToGeom(geom){
		var bounds = d3.geo.bounds(geom);
		map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
	}
	zoomToGeom(d.Districts);

	if (chart_show == 'map') {
		$('#row-chart-container').hide();
		// if (map_filters.length == 0) {
			// zoomToGeom(d.Districts);
		// } else {
			// var districts_temp = JSON.parse(JSON.stringify(d.Districts));
			// districts_temp.features = [];
			// for (var i=0;i<d.Districts.features.length;i++){
				// if (map_filters.indexOf(d.Districts.features[i].properties.id) > -1) {
					// districts_temp.features.push(d.Districts.features[i]);
				// }
			// }
			// zoomToGeom(districts_temp);
		// }
		//mapShow();
	} else if (chart_show == 'row') {
		tabularShow();
	}
    $(".sidebar-wrapper").addClass("in");
    $('.view-buttons button.active').removeClass('active');
    $('.view-buttons button.btn-map-view').addClass('active');
    










};
