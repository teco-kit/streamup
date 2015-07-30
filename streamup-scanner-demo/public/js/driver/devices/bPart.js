bPart = (function() {

	var LIGHT_SERVICE = "4b822f00-3941-4a4b-a3cc-b2602ffe0d00"
	var LIGHT_DATA = "4b822f01-3941-4a4b-a3cc-b2602ffe0d00"
	var LIGHT_CONFIG = "4b822f02-3941-4a4b-a3cc-b2602ffe0d00"

	var bPart = {};
	bPart.lightOff = {

			uuid:  {
				service : LIGHT_SERVICE,
				data : LIGHT_DATA,
				config : LIGHT_CONFIG,
				configValue: 0,
				period : null,
				periodValue: null,
				notification : null			
			}

	}
	bPart.lightOn = {
			decoder : function(data) {	
						console.log("light sensor value: " + JSON.stringify(data));
					return data;
			},
			uuid:  {
				service : LIGHT_SERVICE,
				data : LIGHT_DATA,
				config : LIGHT_CONFIG,
				configValue: 1,
				period : null,
				periodValue: null,
				notification : null			
			}


		}
















	return bPart;
})();