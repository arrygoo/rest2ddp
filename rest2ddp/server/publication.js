// hard-coded data structure that will eventually come from an API call
data = [
  {a: 1, id: 1},
  {b: 2, id: 2}
];

// hard-coded config that will eventually come from a collection
config = {
  collectionName: "testCollection", // the name of the collection that this api call's results will be published to
  url: "http://api.duckduckgo.com/?q=meteor&format=json&pretty=1",
  path: "$.RelatedTopics.*" // a JsonPath expression to pick out the array we want from the API result
};

Meteor.publish("rest2ddp", function () {
  var self = this;
  var lastResult;
  
  Meteor.setInterval(() => {
    // stringify and parse so that we're sure to have a deep copy
    // var result = JSON.parse(JSON.stringify(data));
    
    var rawResult = HTTP.get(config.url);
    if (rawResult.statusCode !== 200) {
      throw new Meteor.error("HTTP-request-failed", "The HTTP request failed with status code: " + rawResult.statusCode);
    }
    var result = JsonPath.query(JSON.parse(rawResult.content), config.path);
    
    // console.log('@@@', "result", result);

    var diff = DeepDiff.diff(lastResult, result);
    
    var added = new Map();
    var removed = new Map();
    var changed = new Map();

    if (!lastResult) {
      // this is the first time, all are new
      for (var i = 0; i < result.length; i++) {
        // console.log("@@@ Rule 0: added", i, result[i]);
        self.added(config.collectionName, i, result[i]);
      }
    } else if (!diff) {
      // console.log ("No difference");
    } else {
      // console.log('@@@', "diff", diff);
      for (var diffItem of diff) {
        if (diffItem.kind === "A" && diffItem.index && diffItem.path === undefined) {
          if (diffItem.item.kind === "D") {
            // console.log("@@@ Rule 1.1", "removed", diffItem.index);
            removed.set(diffItem.index, true);
          } else if (diffItem.item.kind === "N") {
            // console.log("@@@ Rule 1.2", "added", diffItem.index, result[diffItem.index]);
            added.set(diffItem.index, result[diffItem.index]);
          }
        } else if (diffItem.kind === "A" && diffItem.path) {
          // console.log('@@@ Rule 2', "changed", diffItem.path[0], result[diffItem.path[0]]);
          changed.set(diffItem.path[0], result[diffItem.path[0]]);
        } else if (diffItem.kind === "E") {
          // console.log('@@@ Rule 3', "changed", diffItem.path[0], result[diffItem.path[0]]);
          changed.set(diffItem.path[0], result[diffItem.path[0]]);
        } else if (diffItem.kind === "N" && diffItem.path) {
          // console.log('@@@ Rule 4', "changed", diffItem.path[0], result[diffItem.path[0]]);
          changed.set(diffItem.path[0], result[diffItem.path[0]]);
        } else if (diffItem.kind === "D" && diffItem.path) {
          // console.log('@@@ Rule 5', "changed", diffItem.path[0], result[diffItem.path[0]]);
          changed.set(diffItem.path[0], result[diffItem.path[0]]);
        } else {
          console.log('!!! Unhandled change', diffItem);
        }
      }
    }
    
      added.forEach((doc, id) => {
        console.log("added", id, ":", doc);
        self.added(config.collectionName, id, doc);
      });
      removed.forEach((doc, id) => {
        console.log("removed", id, ":", doc);
        self.removed(config.collectionName, id);
      });
      changed.forEach((doc, id) => {
        console.log("changed", id, ":", doc);
        self.changed(config.collectionName, id, doc);
      });
      
    
    lastResult = result;
    self.ready();
  }, 5000);
  
});
