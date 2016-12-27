/**
 * Created by HDA3014 on 12/11/2016.
 */
String.prototype.canonize = function() {
    return this.replace(/    /g,"\t");
};

String.prototype.extract = function(startPattern, endPattern) {
    let start = this.indexOf(startPattern);
    if (start<0) return "";
    let result = this.slice(start);
    let end = result.indexOf(endPattern);
    if (end<0) {
        return result;
    }
    else {
        return result.slice(0, end);
    }
};

String.prototype.file = function(file) {
    return this.extract("// FILE : "+file, "//---------------------------------------------------");
};

String.prototype.contains = function(pattern) {
    return this.indexOf(pattern.canonize())>=0;
};
