$(document).ready(function() {

  spinners = ["bj", "nj", "hz"];
  $.each(spinners, function(index, item) {
    $("#region-spinner-" + item).spinner();
  });

  sliders = [
    {"id": "keylen",  "type": "plain",    "min": 0,  "max": 255, "default": 64, "step": 16, "suffix": "B"},
    {"id": "keynum",  "type": "metric",   "min": 50, "max": 115, "default": 80, "step": 1,  "suffix": "个"},
    {"id": "itemnum", "type": "metric",   "min": 0,  "max": 80,  "default": 20, "step": 1,  "suffix": "个"},
    {"id": "itemlen", "type": "imperial", "min": 0,  "max": 60,  "default": 30, "step": 1,  "suffix": "B"},
    {"id": "rbat",    "type": "metric",   "min": 0,  "max": 30,  "default": 13, "step": 1,  "suffix": "个"},
    {"id": "rqps",    "type": "metric",   "min": 20, "max": 80,  "default": 40, "step": 1,  "suffix": "/s"},
    {"id": "wbat",    "type": "metric",   "min": 0,  "max": 30,  "default": 13, "step": 1,  "suffix": "个"},
    {"id": "wqps",    "type": "metric",   "min": 10, "max": 70,  "default": 30, "step": 1,  "suffix": "/s"},
  ];

  valueType = {
    "string" : {"type": "single-item", "value-extra": 56,  "item-extra": 0},
    "hash"   : {"type": "multi-item",  "value-extra": 120, "item-extra": 56},
    "list"   : {"type": "multi-item",  "value-extra": 100, "item-extra": 24},
    "set"    : {"type": "multi-item",  "value-extra": 120, "item-extra": 32},
    "sorted-set" : {"type": "multi-item",  "value-extra": 148, "item-extra": 112}
  };

  Calculator = function() {
    this.data = function(copynum, keylen, keynum, valtype, valextra, itemlen, itemnum, itemextra) {
      return (keylen + valextra + (itemlen + itemextra) * itemnum) * keynum * copynum * 1.15;
    }
    this.server = function(copynum, keylen, keynum, valtype, valextra, itemlen, itemnum, itemextra, rbat, rqps, wbat, wqps) {
      // memory per server
      mps = 40 * Math.pow(10, 9);
      // server by memory
      bymem = this.data(copynum, keylen, keynum, valtype, valextra, itemlen, itemnum, itemextra) / mps;
      // server by cpu
      qps = rbat * rqps + wbat * wqps;
      bycpu = qps / (4 * Math.pow(10, 4));
      // server by net
      bynet = qps * (keylen + valextra + (itemlen + itemextra) * itemnum) / (70 * Math.pow(10, 6));

      $("#result-bymem").html(bymem.toFixed(2));
      $("#result-bycpu").html(bycpu.toFixed(2));
      $("#result-bynet").html(bynet.toFixed(2));

      return Math.max(copynum * bymem, copynum * bynet, copynum * bycpu);
    }
  }

  dataInit = dataChange = function(obj, id, value) {
    // decide what value-type
    selector = (obj == "value-type") ? id : ".value-type.active";
    valtype = $(selector).attr("value-type");
    // get number of copy
    var copy = 0;
    $(".region-input").each(function() {
      idccopy = parseInt($(this).val());
      if (idccopy > 0) {
        copy += idccopy;
      }
    });
    c = new Calculator();
    formatizeWrapper = function(id, currId, value) {
      if (obj == "slider" && id == currId) {
        useValue = value;
      } else {
        useValue = $("#slider-" + id).slider("value");
      }
      return formatize($("#slider-" + id).attr("type"), "%d", useValue);
    }
    valmeta = valueType[valtype];
    valtype = valmeta["type"];
    valextra = valmeta["value-extra"];
    itemextra = valmeta["item-extra"];

    keylen = formatizeWrapper("keylen", id, value);
    keynum = formatizeWrapper("keynum", id, value);
    itemlen = formatizeWrapper("itemlen", id, value);
    if (valtype == "single-item") {
      itemnum = 1;
    } else if (valtype == "multi-item") {
      itemnum = formatizeWrapper("itemnum", id, value);
    }
    rbat = formatizeWrapper("rbat", id, value);
    rqps = formatizeWrapper("rqps", id, value);
    wbat = formatizeWrapper("wbat", id, value);
    wqps = formatizeWrapper("wqps", id, value);

    d = c.data(copy, keylen, keynum, valtype, valextra, itemlen, itemnum, itemextra);
    s = c.server(copy, keylen, keynum, valtype, valextra, itemlen, itemnum, itemextra, rbat, rqps, wbat, wqps);
    $("#data-quantity").html(formatize("imperial", "%s", d) + "B");
    $("#server-quantity").html(formatize("metric", "%s", s));

    $("#result-keylen").html($("#slider-ui-keylen").html());
    $("#result-keynum").html($("#slider-ui-keynum").html());
    $("#result-valextra").html(valextra + "B");
    $("#result-itemlen").html($("#slider-ui-itemlen").html());
    if (valmeta["type"] == "single-item") {
      $("#result-value-single-item").show().html($("#slider-ui-itemlen").html());
      $("#result-value-multi-item").hide();
    } else {
      $("#result-value-single-item").hide();
      $("#result-value-multi-item").show();
      $("#result-itemnum").html($("#slider-ui-itemnum").html());
      $("#result-itemextra").html(itemextra + "B");
    }
    $(".result-copynum").html(copy);
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
        dataChange("slider", item.id, ui.value);
      }
    });
    $("#slider-" + item.id).attr("type", item.type);
    $("#slider-ui-" + item.id).html(formatize(item.type, "%p", $("#slider-" + item.id).slider("value")) + item.suffix);
  });

  $(".ui-spinner-button").click(function() {
    dataChange();
  });

  validateCopies = function(button) {
    spinner = $(button).siblings("input");
    value = spinner.spinner("value");
    if (value <= 0) {
      spinner.spinner("value", 0);
    }
  }
  $(".ui-spinner-up").click(function() { validateCopies(this); });
  $(".ui-spinner-down").click(function() { validateCopies(this); });

  $(".value-type").click(function() {
    type = $(this).attr("value-type");
    item = valueType[type];
    if (item.type == "single-item") {
      $("#slider-itemnum").parent().hide();
      $("#slider-ui-itemnum").parent().hide();
      $("#slider-itemlen").parent().removeClass("col-sm-3").addClass("col-sm-6");
      $("#label-vallen").html("Value 的长度");
    } else if (item.type == "multi-item") {
      $("#slider-itemnum").parent().show();
      $("#slider-ui-itemnum").parent().show();
      $("#slider-itemlen").parent().removeClass("col-sm-6").addClass("col-sm-3");
      $("#label-vallen").html("Value 中 item 的个数/长度");
    }
    dataChange("value-type", this);
  });

  dataInit();

});
