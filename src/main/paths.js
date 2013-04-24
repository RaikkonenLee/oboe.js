
var jsonPathCompiler = (function () {

   /**
    * Expression for a named path node
    */
   function namedNodeExpr(previousExpr, name, pathArray, pathArrayIndex ) {
      return pathArray[pathArrayIndex] == name && previousExpr(pathArray, pathArrayIndex-1);         
   }

   /**
    * Expression for *, [*] etc
    */
   function anyNodeExpr(previousExpr, ignoredSubexpression, pathArray, pathArrayIndex ){      
      return previousExpr(pathArray, pathArrayIndex-1);
   }
   
   /**
    * Expression for .. (double dot) token
    */   
   function multipleUnnamedNodesExpr(previousExpr, ignoredSubexpression, pathArray, pathArrayIndex ) {
      
      // past the start, not a match:
      if( pathArrayIndex < -1 ) {
         return false;
      }
   
      return pathArrayIndex == -1 || // -1 is sometimes the root 
             previousExpr(pathArray, pathArrayIndex) || 
             multipleUnnamedNodesExpr(previousExpr, ignoredSubexpression, pathArray, pathArrayIndex-1);         
   }      
   
   /**
    * Expression for $ - matches only the root element of the json
    */   
   function rootExpr(ignoredPreviousExprs, ignoredSubexpression, pathArray, pathArrayIndex ){
      return pathArrayIndex == -1;
   }   
   
   /**
    * Expression for . does no tests since . is just a seperator. Just passes through to the
    * next function in the chain.
    */   
   function passthrough(previousExpr, ignoredSubexpression, pathArray, pathArrayIndex) {
      return previousExpr(pathArray, pathArrayIndex);
   }   
        
   /**
    * Wrapper for an expression that makes up a statement.
    * Returns a function that acts as the kick-off point for evaluating the expression
    */   
   function statement(lastStatementExpr, pathArray){
      return lastStatementExpr(pathArray, pathArray.length-1);
   }

   /**
    * Each of the sub-arrays has at index 0 a pattern matching the token.
    * At index 1 is the expression function to return a function to parse that expression
    */
   function tokenExpr(pattern, parser) {
      return {pattern:pattern, parser:parser};
   }     
   var tokenExprs = [
      tokenExpr(/^(\w+)/       , namedNodeExpr),
      tokenExpr(/^\[(\d+)\]/   , namedNodeExpr),
      tokenExpr(/^\["(\w+)"\]/ , namedNodeExpr),
      tokenExpr(/^\.\./        , multipleUnnamedNodesExpr),
      tokenExpr(/^\$/          , rootExpr),      
      tokenExpr(/^\*/          , anyNodeExpr),
      tokenExpr(/^\[\*\]/      , anyNodeExpr),      
      tokenExpr(/^\./          , passthrough)
   ];

   /** 
    * compile the next part of a jsonPath
    */
   function compileNextToken( jsonPath, compiledSoFar ) {
                
      for (var i = 0; i < tokenExprs.length; i++) {
         var tokenMatch = tokenExprs[i].pattern.exec(jsonPath);
             
         if(tokenMatch) {
            var parser = tokenExprs[i].parser.bind(null, compiledSoFar, tokenMatch[1]),
                remainingString = jsonPath.substr(tokenMatch[0].length);
         
            return remainingString? compileNextToken(remainingString, parser) : parser;
         }
      }
      
      // couldn't find any match, jsonPath is probably invalid:
      throw Error('got stuck at "' + jsonPath + '"');      
   }

   /**
    * A function that, given a jsonPath string, returns a function that tests against that
    * jsonPath.
    * 
    *    String -> (String[] -> Boolean)
    */
   return function (jsonPath) {        
      try {        
         return statement.bind(null, compileNextToken(jsonPath, function(){return true}));
      } catch( e ) {
         throw Error('Could not compile ' + jsonPath + ' because ' + e);
      }
   };
   
})();
