/*! Tiny Loggly
 *  Copyright (c) 2015, Morris Johns, All rights reserved. License: https://github.com/MorrisJohns/TinyLoggly/blob/master/LICENSE
 */

// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// 
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


// ABOUT Pushes JSON data into Loggly.com from the browser. Tries to have readable code, while keeping the code length small.
// BEWARE window.screen, window.navigator, window.location, and window.performance.timing are NOT enumerable and values need to be manually copied if you want to pass them into this.
// PLEASE don't report bugs, features, or ask me anything. We didn't actually use this code because of data privacy issues.
// MODIFIES keys: appends $n to keys for number values to prevent nasty loggly error "Removed parsed fields because of mapping conflict while indexing (i.e originally sent as one type and later sent as new type)"
// MODIFIES keys: Note that Loggly itself limits keys to 64 characters and it also replaces any spaces or dots (within keys) by underscores.
// BEWARE that Loggly limits keys to 100 or so (I think across all JSON input) and just won't parse anything after that. So be careful to limit the number of variables in your JSON
// IMPROVES sessionId's by making them properly random in modern browsers (not using Math.random() if possible due to collisions).
// ALSO SEE https://www.loggly.com/docs/http-endpoint/ and https://www.loggly.com/docs/automated-parsing/

window.TinyLoggly = {

	log: function(rawData) {

		// !!!!!!!!!!!!!!!!!!!!!!!! PUT YOUR LOGGLY KEY HERE !!!!!!!!!!!!!!!!!!!!!!!!
		var LOGGLY_KEY = '00000000-0000-4000-8000-000000000000';

		// parse+stringify drops references to system objects and non-enumerables, ensures no circular references (throws exception), and also removes all undefined fields
		var safeData = JSON.parse(JSON.stringify(rawData));
		if (!safeData || typeof safeData != 'object' || this.isArray(safeData)) {
			return;
		}
		//this.cleanCount = 0;
		var data = this.clean(safeData);
		if (!data) {
			return;
		}
		// this.cleanCount > 100 && console.log('TinyLoggly more than 100 keys: ' + this.cleanCount);

		data.sessionId = this.sessionId || (this.sessionId = this.uuid());
		data.timestamp = (new Date).toISOString();

		if (window.XMLHttpRequest) {
			var xhr = new XMLHttpRequest;
			var content = JSON.stringify(data);
			xhr.open('POST', 'https://logs-01.loggly.com/inputs/' + LOGGLY_KEY + '/tag/http/', true);
			xhr.send(content);
		} else {
			(new Image()).src = 'https://logs-01.loggly.com/inputs/' + LOGGLY_KEY + '.gif?' + 'PLAINTEXT=' + encodeURIComponent(content);	// will only work within url length limitation
		}

	},

	getPerformance: function(data) {
		function timingDeltas() {
			var result = {};
			for (var key in timing) {
				var value = timing[key];
				if (typeof value == 'number' && value) {
					result[key] = value - start;
				}
			}
			return result;
		}

		var timing = ('now' in (window.performance || {})) && performance.timing;	// Note that Chrome also has window.chrome.loadTimes() with some other details
		if (timing) {
			var start = timing.navigationStart;
			data.timing = timingDeltas();
		}
	},

	isArray: Array.isArray || function(array) {
		return Object.prototype.toString.call(array) === '[object Array]';
	},

	clean: function(obj) {	// drop empty objects, append $n to keyname of numbers to prevent loggly error "Removed parsed fields because of mapping conflict while indexing (i.e originally sent as one type and later sent as new type)"
		if (typeof obj != 'object' || obj === null) {
			return;
		}
		if (!this.isArray(obj)) {
			return;
		}
		/*
		if (this.isArray(obj)) {
			if (obj.length < 100) {
				for (var i = 0; i < obj.length; i++) {
					var value = obj[i];
					switch (typeof value) {
						case 'object': {	// Also null. Also various objects like RegExp (which JSON simplifies to {} and that is elided).
							if (value !== null) {
								value = this.clean(value);	// Recursion OK because prevent circular references earlier
							}
							break;
						}
						case 'number':
						case 'boolean':
						case 'string': {
							break;
						}
						default: {	// symbol, host object, undefined.
							value = undefined;
							break;
						}
					}
					if (value !== undefined) {
						var cleaned = cleaned || [];
						cleaned[i] = value;
					}
				}
			} else {
				console.log('TinyLoggly ignoring log array bigger than 100');
				}
			}
		} else {
		*/
		var hasOwnProperty = Object.prototype.hasOwnProperty;
		for (var key in obj) {
			if (hasOwnProperty.call(obj, key)) {
				var value = obj[key];
				switch (typeof value) {
					case 'object': {	// Also null. Also various objects like RegExp (which JSON simplifies to {} which is then elided).
						if (value !== null) {
							value = this.clean(value);	// Recursion OK because assure no circular references earlier using parse+stringify
						}
						break;
					}
					case 'number': {
						if (isFinite(value)) {
							key = key + '$n';
						} else {
							key = key + '$nan';	// Also +-inifinity
							value = '' + value;
						}
						break;
					}
					case 'boolean': {
						value = value ? 'true' : 'false';
						break;
					}
					case 'string': {
						break;
					}
					default: {	// symbol, host object, undefined.
						value = undefined;
						break;
					}
				}
				if (value !== undefined) {
					var cleaned = cleaned || {};
					cleaned[key] = value;
					// this.cleanCount++;
				}
			}
		}
		return cleaned;
	},

	uuid: function() {
		function randomDigit() {
			if (crypto && crypto.getRandomValues) {	// IE11+, iOS7+, FF21+, Chrome, Android Chrome: http://caniuse.com/#search=getRandomValues
				var rands = new Uint8Array(1);
				crypto.getRandomValues(rands);
				return (rands[0] % 16).toString(16);
			} else {
				return ((Math.random() * 16) | 0).toString(16);	// OUCH - not very random... will often get duplicates from different sites. Not adding time since same issue.
			}
		}
		var crypto = window.crypto || window.msCrypto;
		return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, randomDigit);	// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
	}

};
