$(document).ready(function() {

  Calculator = function() {
    this.length = function(keylen, vallen) {
      return keylen + vallen;
    }
    this.data = function(copynum, keylen, keynum, vallen) {
      return this.length(keylen, vallen) * keynum * copynum;
    }
    this.server = function(copynum, keylen, keynum, vallen, rqps, wqps) {
      // memory per server
      mps = 40 * Math.pow(10, 9);
      // server by memory
      bymem = this.data(1, keylen, keynum, vallen) / mps;
      // server by cpu
      qps = rqps + wqps;
      bycpu = qps / (4 * Math.pow(10, 4));
      // server by net
      bynet = qps * this.length(keylen, vallen) / (70 * Math.pow(10, 6));

      $("#result-bymem").html(bymem.toFixed(2));
      $("#result-bycpu").html(bycpu.toFixed(2));
      $("#result-bynet").html(bynet.toFixed(2));

      return Math.max(bymem * copynum, bynet * copynum, bycpu * copynum);
    }
  }

  sliders = {
    "keylen": {type: "plain",    min: 0,  max: 255, default: 64, step: 16, suffix: "B"},
    "keynum": {type: "metric",   min: 50, max: 115, default: 80, step: 1,  suffix: "个"},
    "vallen": {type: "imperial", min: 0,  max: 60,  default: 30, step: 1,  suffix: "B"},
    "rqps"  : {type: "metric",   min: 20, max: 80,  default: 40, step: 1,  suffix: "/s"},
    "wqps"  : {type: "metric",   min: 10, max: 70,  default: 30, step: 1,  suffix: "/s"}
  };

  dataInit = dataChange = function(id, value) {
    var copy = 0;
    $(".checkbox-region").each(function() {
      if ($(this).attr("include") == "yes") {
        copy += parseInt($(this).attr("idcs"));
      }
    });
    c = new Calculator();
    formatizeWrapper = function(id, currId, value) {
      return formatize($("#slider-" + id).attr("type"), "%d", (id == currId) ? value : $("#slider-" + id).slider("value"));
    }
    keylen = formatizeWrapper("keylen", id, value);
    keynum = formatizeWrapper("keynum", id, value);
    vallen = formatizeWrapper("vallen", id, value);
    rqps = formatizeWrapper("rqps", id, value);
    wqps = formatizeWrapper("wqps", id, value);
    d = c.data(copy, keylen, keynum, vallen);
    s = c.server(copy, keylen, keynum, vallen, rqps, wqps);
    $("#data-quantity").html(formatize("imperial", "%s", d) + "B");
    $("#server-quantity").html(formatize("metric", "%s", s));

    $("#result-keylen").html($("#slider-ui-keylen").html());
    $("#result-vallen").html($("#slider-ui-vallen").html());
    $("#result-keynum").html($("#slider-ui-keynum").html());
    $(".result-copynum").html(copy);

  }

  $.each(sliders, function(id, item) {
    $("#slider-" + id).slider({
      range: "min",
      min: item.min,
      max: item.max,
      value: item.default,
      step: item.step,
      slide: function (event, ui) {
        $("#slider-ui-" + id).html(formatize(item.type, "%p", ui.value) + item.suffix);
        dataChange(id, ui.value);
      }
    });
    $("#slider-" + id).attr("type", item.type);
    $("#slider-ui-" + id).html(formatize(item.type, "%p", $("#slider-" + id).slider("value")) + item.suffix);
  });

  $(".region").click(function() {
    if ($(this).hasClass("active")) {
      $(this).children(".checkbox-region").attr("include", "no");
    } else {
      $(this).children(".checkbox-region").attr("include", "yes");
    }
    dataChange();
  });

  dataInit();

});
