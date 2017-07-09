# require
require works a lot like require in NodeJS, but instead of returning an object with properties attached, it returns a [JavaScript Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). This promise will resolve when all other requires have been loaded in the case of scripts, but behaves differently in the case of data or styles. require resolved immediately if a style tag is requested, and resolving as soon at the data has returned in the case of text or json. If it is a text or json file, the 'then' function will be passed the result, if it is a script or style element the then function will just be passed true.

This function has some interesting use patterns.

## Examples

### Module / function definition file 

In this case someone 'require'ing your module will not be able to call myModule until A, B and C have resolved. 

#### A.js
```JavaScript
A = function (input) {
    return input.val;
};
```

#### B.js
```JavaScript
B = function (input) {
    return input.val + 1;
}
```

#### C.js
```JavaScript
C = function (input) {
    return input.val + 2;
};
```

#### myModule.js
```JavaScript
(function (exports) {
    'use strict';

    // A module that only defines functions
    require('A.js');
    require('B.js');
    require('C.js');

    exports.myModule = function (input) {
        console.log(A(input), B(input), C(input));
    };

}(window));
```

### Action Script

These will actually do things, they do need some extra things attached. Here is an elegent native example.

#### myScript.js
```JavaScript
(function (exports) {
    'use strict';

    //get the module
    require('myModule.js');

    require(function (ret) {
        //This will not fire till all the requires resolve
        myModule({val: 1}); //console.log: 1, 2, 3.

        console.log(ret) // undefined
    });
}(window))
```

Here is an example using promises.

#### myScript.js
```JavaScript
(function (exports) {
    'use strict';

    //get the module
    var requires = [require('myModule.js')];

    Promise.all(requires).then(function (ret) {
        myModule({val: 1}); //console.log: 1, 2, 3.

        console.log(ret);  // [true]
    });
}(window))
```

Both of these sytaxes will work. The major difference is that when using the Promise architecture you have access to the returned values. Without it you do not. This means for loading in scripts and styles the first example makes more sense, for loading in data or text though, you have to use the second one or a combination. As what follows below.

#### data.json
```JavaScript
{
    "val": 5
}
```

#### myScript.js
```JavaScript
(function (exports) {
    'use strict';

    //get the module
    require('myModule.js');
    var dataPromise = require('data.json');

    require(function () {
        return dataPromise;
    }).then(function (data) {
        myModule(data); //console.log: 5, 6, 7.
    });
}(window))
```

## parameters

`require(<i>request</i> [,<i>type</i> [,<i>cache</i>]])`

- *request*: (required) 
  - required: true
  - type: string (url or key) | array | function
  - behavior:
    - string (url): utilize an ajax call to load in the requested resource. This will be loaded based on the data type as indicated by either the type parameter or pattern matching the file extension. Default: JavaScript.
    - string (key): checks against the require.default (editable dynamically and viewable here: [require.defaults](https://github.com/kinome/kinome_toolbox/blob/master/js/client/web_namespace.js#L20)) for the key and 'requires' the corresponding url as above.
    - array: this can be an array of any valid data type. It will call require recursively, passing type and cache if indicated in the original call.
    - function: this function will be queued to fire once all other require calls have been returned. It is an alternative to `require.then(function(){/*Do stuff*/})`.

- *type*: 
  - required: false
  - type: string
  - options: 'text, txt, string' (resolves as text); 'style, css' (resolves as style sheet), 'json, data', resolves as JSON.

- *cache*: 
  - required: false
  - type: bool
  - behavior: If false then cache will clear and be replaced by the newest file. If true, then it will always pull from the cache when possible (if within limits [limits](#caching-limits)).

## Caching

require caches everything except scripts. This caching is powered by IndexedDB and [dexie](http://dexie.org).

### Caching Limits

Text and JSON default to a 30 minute cache. 

If the system is getting specific documents from a mongodb instance these are cached for 90 days.

All style documents are cached for 90 days.

## Local storage

In addition to caching external resourses, require allows for caching of user defined local resourses. This storage is powered by IndexedDB and [dexie](http://dexie.org).

### getting data

In addition to general URLs, require recognizes specialed URLs that look like: `local://collection/key`. These collections have to be predefined and currently accepted values are:
- name
- lvl_1.0.0
- lvl_1.0.1
- lvl_1.1.2
- lvl_2.0.1
- lvl_2.1.2

If a key is not provided, the entire collection will be returned. This is not reccomended except for the 'name' database. These will collections will have no data in them until a user adds data.

### Adding data

#### require.store('collection', data)

Just as it looks, tell it the collection and the data you want to store and it will store it for you. This returns a promise and will only work with one of the above predefined collections. Additionally, if you do not provide an '_id' key then one will be created for you randomly.

### Advanced

There are many advanced options for this cache. They are all attached to the require.database object. Go to your console and take a look for more information. Additionally you can look [here](https://github.com/kinome/kinome_toolbox/blob/master/js/client/web_namespace.js#L91) in the code.
