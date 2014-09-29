$(document).ready(function(){

  Decimal = function() {
    this.decimal = 3;
    this.units = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];
    this.magnify = function(fmt, notation) {
      unit = Math.floor(notation / 10 / this.decimal);
      base = (notation % 10 == 0) ? 1 : (notation % 10);
      exp  = Math.pow(10, Math.floor(notation / 10) % this.decimal);
      switch (fmt) {
        case "%p": // pretty
          ret = base * exp + this.units[unit];
          break;
        case "%d": // longint
        default:
          ret = base * exp * Math.pow(10, unit * this.decimal);
      }
      return ret;
    }
    this.shrink = function(notation) {
      unit = 0;
      divisor = Math.pow(10, this.decimal);
      remain = notation;
      while (remain >= divisor) {
        remain = remain / divisor;
        unit++;
      }
      return remain.toFixed(2) + this.units[unit];
    }
  }

  Plain = function() {
    this.magnify = function(fmt, notation) { return notation; }
    this.shrink  = function(notation) { return notation; }
  }
  Imperial = function() {}
  Metric = function() {
    this.decimal = 4;
    this.units = ["", "万", "亿", "兆", "京"];
  }
  Plain.prototype = new Decimal();
  Imperial.prototype = new Decimal();
  Metric.prototype = new Decimal();

  formatize = function(type, fmt, notation) {
    var formatter = null;
    switch(type) {
      case "metric":
        formatter = new Metric();
        break;
      case "imperial":
        formatter = new Imperial();
        break;
      default:
        formatter = new Plain();
        break;
    }
    if (fmt == "%s") {
      return formatter.shrink(notation);
    } else {
      return formatter.magnify(fmt, notation);
    }
  }

  $(".info").tooltip({"placement": "right"});

});
