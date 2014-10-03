$(document).ready(function() {

  sliders = {
    "keylen"  : {type: "plain",    min: 0,  max: 255, default: 64, step: 16, suffix: "B"},
    "keynum"  : {type: "metric",   min: 50, max: 115, default: 80, step: 1,  suffix: "个"},
    "itemnum" : {type: "metric",   min: 0,  max: 80,  default: 20, step: 1,  suffix: "个"},
    "itemlen" : {type: "imperial", min: 0,  max: 60,  default: 30, step: 1,  suffix: "B"},
    "rbat"    : {type: "metric",   min: 0,  max: 30,  default: 10, step: 1,  suffix: "个"},
    "rqps"    : {type: "metric",   min: 20, max: 80,  default: 40, step: 1,  suffix: "/s"},
    "wbat"    : {type: "metric",   min: 0,  max: 30,  default: 10, step: 1,  suffix: "个"},
    "wqps"    : {type: "metric",   min: 10, max: 70,  default: 30, step: 1,  suffix: "/s"},
  };

  valueConfig = {
    "string" : {
      type       : "single-item",
      threshold  : {num: 0, len: 0},
      overhead   : {
        plain  : {value: 56, item: 0},
        zipped : {value: 56, item: 0}
      }
    },
    "hash" : {
      type       : "multi-item",
      threshold  : {num: 512, len: 64},
      overhead   : {
        plain  : {value: 56+64, item: 32+24},
        zipped : {value: 56+2,  item: 10}
      }
    },
    "list" : {
      type       : "multi-item",
      threshold  : {num: 512, len: 64},
      overhead   : {
        plain  : {value: 56+44, item: 24},
        zipped : {value: 56+11, item: 10}
      }
    },
    "set" : {
      type       : "multi-item",
      threshold  : {num: 0, len: 0},
      overhead   : {
        plain  : {value: 56+64, item: 32},
        zipped : {value: 56+64, item: 0}
      }
    },
    "sorted-set" : {
      type       : "multi-item",
      threshold  : {num: 128, len: 64},
      overhead   : {
        plain  : {value: 56+64+28, item: 32+24+36+16},
        zipped : {value: 56+11,    item: 10}
      }
    }
  };

  Calculator = function() {
    this.length = function(keylen, valtype, itemnum, itemlen) {
      config = valueConfig[valtype];
      if (itemnum <= config.threshold.num &&
          itemlen <= config.threshold.len) {
        overhead = config.overhead.zipped;
      } else {
        overhead = config.overhead.plain;
      }
      $("#result-valextra").html(overhead.value + "B");
      $("#result-itemextra").html(overhead.item + "B");
      return keylen + (itemlen + overhead.item) * itemnum + overhead.value;
    }
    this.data = function(copynum, keylen, keynum, valtype, itemnum, itemlen) {
      return this.length(keylen, valtype, itemnum, itemlen) * keynum * copynum * 1.15;
    }
    this.server = function(copynum, keylen, keynum, valtype, itemlen, itemnum, rbat, rqps, wbat, wqps) {
      // memory per server
      mps = 40 * Math.pow(10, 9);
      // server by memory
      bymem = this.data(copynum, keylen, keynum, valtype, itemnum, itemlen) / mps;
      // server by cpu
      qps = rbat * rqps + wbat * wqps;
      bycpu = qps / (4 * Math.pow(10, 4));
      // server by net
      bynet = qps * this.length(keylen, valtype, itemnum, itemlen) / (70 * Math.pow(10, 6));

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

    config = valueConfig[valtype];

    keylen = formatizeWrapper("keylen", id, value);
    keynum = formatizeWrapper("keynum", id, value);
    itemlen = formatizeWrapper("itemlen", id, value);
    if (config.type == "single-item") {
      itemnum = 1;
    } else if (config.type == "multi-item") {
      itemnum = formatizeWrapper("itemnum", id, value);
    }
    rbat = formatizeWrapper("rbat", id, value);
    rqps = formatizeWrapper("rqps", id, value);
    wbat = formatizeWrapper("wbat", id, value);
    wqps = formatizeWrapper("wqps", id, value);

    d = c.data(copy, keylen, keynum, valtype, itemnum, itemlen);
    s = c.server(copy, keylen, keynum, valtype, itemnum, itemlen, rbat, rqps, wbat, wqps);
    $("#data-quantity").html(formatize("imperial", "%s", d) + "B");
    $("#server-quantity").html(formatize("metric", "%s", s));

    $("#result-keylen").html($("#slider-ui-keylen").html());
    $("#result-keynum").html($("#slider-ui-keynum").html());
    $("#result-itemlen").html($("#slider-ui-itemlen").html());
    if (config == "single-item") {
      $("#result-value-single-item").show().html($("#slider-ui-itemlen").html());
      $("#result-value-multi-item").hide();
    } else {
      $("#result-value-single-item").hide();
      $("#result-value-multi-item").show();
      $("#result-itemnum").html($("#slider-ui-itemnum").html());
    }
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
        dataChange("slider", id, ui.value);
      }
    });
    $("#slider-" + id).attr("type", item.type);
    $("#slider-ui-" + id).html(formatize(item.type, "%p", $("#slider-" + id).slider("value")) + item.suffix);
  });

  $(".region-input").spinner();
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
    item = valueConfig[type];
    if (item.type == "single-item") {
      $("#slider-itemnum").parent().parent().hide();
      $("#label-itemlen").html("Value 的长度");
    } else if (item.type == "multi-item") {
      $("#slider-itemnum").parent().parent().show();
      $("#label-itemlen").html("Item 的长度");
    }
    dataChange("value-type", this);
  });

  dataInit();

});
