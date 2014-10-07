$(document).ready(function() {

  sliders = {
    "key-len"  : {type: "plain",    min: 0,  max: 255, default: 64, step: 16, suffix: "B"},
    "key-num"  : {type: "metric",   min: 50, max: 115, default: 80, step: 1,  suffix: "个"},
    "item-num" : {type: "metric",   min: 0,  max: 80,  default: 20, step: 1,  suffix: "个"},
    "item-len" : {type: "imperial", min: 0,  max: 60,  default: 30, step: 1,  suffix: "B"},
    "read-bat" : {type: "metric",   min: 0,  max: 30,  default: 10, step: 1,  suffix: "个"},
    "read-qps" : {type: "metric",   min: 20, max: 80,  default: 40, step: 1,  suffix: "/s"},
    "write-bat": {type: "metric",   min: 0,  max: 30,  default: 10, step: 1,  suffix: "个"},
    "write-qps": {type: "metric",   min: 10, max: 70,  default: 30, step: 1,  suffix: "/s"},
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

  Calculator = {
    single: function(keyLen, valueType, itemNum, itemLen) {
      config = valueConfig[valueType];
      if (itemNum <= config.threshold.num &&
          itemLen <= config.threshold.len) {
        overhead = config.overhead.zipped;
      } else {
        overhead = config.overhead.plain;
      }
      return {
        overhead: overhead,
        length:   keyLen + (itemLen + overhead.item) * itemNum + overhead.value
      }
    },
    space: function(keyLen, keyNum, valueType, itemNum, itemLen) {
      single = this.single(keyLen, valueType, itemNum, itemLen);
      return {
        single: single,
        total:  single.length * keyNum * 1.15
      }
    },
    server: function(keyLen, keyNum, valueType, itemLen, itemNum, readBat, readQps, writeBat, writeQps) {
      // server by space
      space = this.space(keyLen, keyNum, valueType, itemNum, itemLen);
      bySpace = space.total / (40 * Math.pow(10, 9));
      // server by cpu
      allQps = readBat * readQps + writeBat * writeQps;
      byCpu = allQps / (4 * Math.pow(10, 4));
      // server by net throughput
      byNet = allQps * space.single.length / (70 * Math.pow(10, 6));
      return {
        bySpace : bySpace,
        byCpu   : byCpu,
        byNet   : byNet,
        actual  : Math.max(bySpace, byNet, byCpu),
      }
    }
  }

  Event = {};
  Event.dataInit =
  Event.dataChange = function(widget, id, value) {
    // decide what value-type
    selector = (widget == "value-type") ? id : ".value-type.active";
    valueType = $(selector).attr("value-type");
    // get number of copy
    var copy = 0;
    $(".region-input").each(function() {
      idcCopy = parseInt($(this).val());
      if (idcCopy > 0) {
        copy += idcCopy;
      }
    });
    getSlider = function(currId) {
      if (widget == "slider" && id == currId) {
        useValue = value;
      } else {
        useValue = $("#slider-" + currId).slider("value");
      }
      return formatize($("#slider-" + currId).attr("type"), "%d", useValue);
    }

    config = valueConfig[valueType];

    keyLen = getSlider("key-len");
    keyNum = getSlider("key-num");
    itemLen = getSlider("item-len");
    if (config.type == "single-item") {
      itemNum = 1;
    } else if (config.type == "multi-item") {
      itemNum = getSlider("item-num");
    }
    readBat = getSlider("read-bat");
    readQps = getSlider("read-qps");
    writeBat = getSlider("write-bat");
    writeQps = getSlider("write-qps");

    space  = Calculator.space(keyLen, keyNum, valueType, itemNum, itemLen);
    server = Calculator.server(keyLen, keyNum, valueType, itemNum, itemLen, readBat, readQps, writeBat, writeQps);
    fillResult = function(config, copy, space, server) {
      $("#result-key-len").html($("#slider-ui-key-len").html());
      $("#result-key-num").html($("#slider-ui-key-num").html());
      $("#result-item-len").html($("#slider-ui-item-len").html());
      $("#result-item-num").html($("#slider-ui-item-num").html());
      if (config.type == "single-item") {
        $("#result-value-single-item").show().html($("#slider-ui-item-len").html());
        $("#result-value-multi-item").hide();
      } else {
        $("#result-value-single-item").hide();
        $("#result-value-multi-item").show();
      }
      $("#result-item-overhead").html(space.single.overhead.item + "B");
      $("#result-value-overhead").html(space.single.overhead.value + "B");
      $("#result-space-copy-num").html(copy);
      $("#result-space").html(formatize("imperial", "%s", space.total * copy) + "B");

      $("#result-by-space").html(server.bySpace.toFixed(2));
      $("#result-by-cpu").html(server.byCpu.toFixed(2));
      $("#result-by-net").html(server.byNet.toFixed(2));
      $("#result-server-copy-num").html(copy);
      $("#result-server").html(formatize("metric", "%s", server.actual * copy));
    }
    fillResult(config, copy, space, server);
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
        Event.dataChange("slider", id, ui.value);
      }
    });
    $("#slider-" + id).attr("type", item.type);
    $("#slider-ui-" + id).html(formatize(item.type, "%p", $("#slider-" + id).slider("value")) + item.suffix);
  });

  $(".region-input").spinner();
  $(".ui-spinner-button").click(function() {
    spinner = $(this).siblings("input");
    value = spinner.spinner("value");
    if (value <= 0) {
      spinner.spinner("value", 0);
    }
    Event.dataChange();
  });

  $(".value-type").click(function() {
    config = valueConfig[$(this).attr("value-type")];
    if (config.type == "single-item") {
      $("#slider-item-num").parent().parent().hide();
      $("#label-item-len").html("Value 的长度");
    } else if (config.type == "multi-item") {
      $("#slider-item-num").parent().parent().show();
      $("#label-item-len").html("Item 的长度");
    }
    Event.dataChange("value-type", this);
  });

  Event.dataInit();

});
