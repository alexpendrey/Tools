request = require('request');
cheerio = require('cheerio');
colors = require('colors');
q = require('q');

setupColors();

var url = ''; // 'http://www.alexpendrey.com/test';
var urlList = [];
var el = ''; //'#ly1';
var urls = [];

var args = process.argv;

if (args[2] && args[3]) {
	url = args[2];
	el = args[3];
	urls.push(url);
	nextUrl(urls, el);
}
else {
	if (!args[2]) console.log('Specify a URL'.error);
	if (!args[3]) console.log('Specify an element to find'.error);
}

function nextUrl(urls, el) {
	if (urls.length > 0) {
		requestUrl(urls[0], el, urls).then(function() { 
			//console.log('Request Ended. Urls remaining: ');
			urls.splice(0, 1);
			nextUrl(urls, el);
				
		}, function(reason) {
			console.error('Error loading URL '.red + urls[0]);
			urls.splice(0, 1);
			nextUrl(urls, el);

		}).catch(function(error) {
			debugger;
			console.log('error');
		});
	}
	else {
		console.log('Finished processing URLs. Output:');
		console.log(urlList);
	}
}

function requestUrl(url, el, urls) {
	//console.log('Requesting URL %s', url);
	var deferred = q.defer();
	var options = {
		url: url,
		timeout: 3000
	};
	request(options, function(err, resp, body) {

		var matches = isDomainPath(urls[0]);
		var domain = matches && matches[0];
		if (err) {
			urlList = inverseDuplicateUrls(urls[0], urlList);
			urlList.push({url: urls[0], status: 'error', details: err.code});
			return deferred.reject(resp);
		}

		$ = cheerio.load(body);
		var matches = $(el).length;
		//console.log('Matches: ' + matches);

		//Push to the list the actual request URL (or update the item already on the list)
		urlList = inverseDuplicateUrls(urls[0], urlList);
		urlList.push({url: urls[0], status: 'ok', statusCode: resp && resp.statusCode, 
			matches: matches});

		$('a[href]').each(function() { 
			if (this.attribs != undefined && this.attribs.href != undefined) {
				var href = this.attribs.href;

				href = href.slice(0,1) == '/' ? href.slice(1) : href;
				var isDomain = isDomainPath(href);
				if (!isDomain) {
					href = domain ? domain + href : href;
				}
				//Make sure the link hasn't already been requested:
				if (!checkForDuplicateUrl(href, urlList)) {
					urlList.push({url: href});
					urls.push(href);
					//console.log("Url found: " + href);				
				}
				else {
					//console.log("Ignoring duplicate URL");
				}
			}
		});

		deferred.resolve(resp);

	});
	return deferred.promise;
}

function inverseDuplicateUrls(url, urlList) {
	var dupItems = urlList.filter(function(item) {
			return (item.url != url);
	});
	return dupItems;
}

function checkForDuplicateUrl(url, urlList) {
	var dupItems = urlList.filter(function(item) {
			return (item.url == url);
	});
	return dupItems.length>0;
}

function isDomainPath(url) {
	var matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
	return matches;
}

function quickTest(url) {
	requestUrl(url, el, urls).then(function() {
		console.log('Finished');
	});
}

function setupColors() {
	colors.setTheme({
		info: 'green',
		warn: 'yellow',
		error: 'red',
		debug: 'blue'
	});
}