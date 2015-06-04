# TinyLoggly

Pushes JSON data into Loggly.com from the browser. Tries to have readable code, while keeping the code length small.

*Beware* window.screen, window.navigator, window.location, and window.performance.timing are NOT enumerable and values need to be manually copied if you want to pass them into `TinyLoggly.log()`.

You must change the variable LOGGLY_KEY to your own Loggly key for the code to work.

Please don't report bugs, features, or ask me anything. I didn't actually use this code because of data privacy issues.

Keys are modified:

 - appends $n to keys for number values to prevent nasty loggly error "Removed parsed fields because of mapping conflict while indexing (i.e originally sent as one type and later sent as new type)"
 - Loggly itself limits keys to 64 characters and it also replaces any spaces or dots (within keys) by underscores.

Some values are modified or removed:

 - nulls are NOT logged
 - Arrays are NOT logged (there is some commented out code that works though).
 - Empty objects are NOT logged
 - Objects that only contain empty objects or nulls are NOT logged.
 - Booleans true and false are changed to 'true' and 'false' strings.
 - Number values - see above comment on appending $n to the key
 - NaN/Inifinity/-Infinity are converted to strings

Loggly limits keys to 100 or so (I think across all JSON input) and just won't parse anything after that. So be careful to limit the number of variables in your JSON.

This code improves the randomisation of sessionId's (compared to the default loggly JavaScript code) by making them properly random in modern browsers.

Maybe still get Mapping Conflict if mix Object/Array/String for the same key - fix would be to append other unique identifiers to the key for each of the accepted types (same as we do for Number).

Relevant loggly documentation is at:

 - https://www.loggly.com/docs/http-endpoint/
 - https://www.loggly.com/docs/automated-parsing/
