$(document).ready(function() {

  Calculator = function() {
    this.data = function(copynum, keylen, keynum, vallen) {
      return (keylen + vallen) * keynum * copynum;
    }
    this.server = function(copynum, keylen, keynum, vallen, rqps, wqps) {
      // memory per server
      mps = 40 * Math.pow(10, 9);
      // server by memory
      bymem = this.data(copynum, keylen, keynum, vallen) / mps;
      // server by cpu
      qps = copynum * (rqps + wqps);
      bycpu = qps / (4 * Math.pow(10, 4));
      // server by net
      bynet = qps * (keylen + vallen) / (70 * Math.pow(10, 6));
      return Math.max(bymem, bynet, bycpu);
    }
  }

  sliders = [
    {"id": "keylen", "type": "plain",    "min": 0,  "max": 255, "default": 64, "step": 16, "suffix": "Byte"},
    {"id": "keynum", "type": "metric",   "min": 50, "max": 115, "default": 80, "step": 1,  "suffix": "个"},
    {"id": "vallen", "type": "imperial", "min": 0,  "max": 60,  "default": 30, "step": 1,  "suffix": "B"},
    {"id": "rqps",   "type": "metric",   "min": 20, "max": 80,  "default": 40, "step": 1,  "suffix": "/s"},
    {"id": "wqps",   "type": "metric",   "min": 10, "max": 70,  "default": 30, "step": 1,  "suffix": "/s"},
  ];
  copies = [];
  // copies = ["1", "2", "3"];

  dataInit = dataChange = function(id, value) {
    // var copy = parseInt($("#copynum").attr("value"), 10);
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
  }

  $.each(sliders, function(index, item) {
    $("#slider-" + item.id).slider({
      range: "min",
      min: item.min,
      max: item.max,
      value: item.default,
      step: item.step,
      slide: function (event, ui) {
        $("#slider-ui-" + item.id).html(formatize(item.type, "%p", ui.value) + item.suffix);
        dataChange(item.id, ui.value);
      }
    });
    $("#slider-" + item.id).attr("type", item.type);
    $("#slider-ui-" + item.id).html(formatize(item.type, "%p", $("#slider-" + item.id).slider("value")) + item.suffix);
  });

  $.each(copies, function(index, item) {
    $("#copynum-" + item).click(function() {
      $(".copynum").removeClass("active");
      $(this).addClass("active");
      $("#copynum").val(item);
      dataChange();
    });
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
