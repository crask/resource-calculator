$(document).ready(function() {

  /**
   *  widgets profile data
   */
  regions = {
    "bj" : {idcs: 2},
    "nj" : {idcs: 0},
    "hz" : {idcs: 0}
  };

  sliders = {
    "key-len"  : {type: "plain",    min: 0,  max: 255, default: 64, step: 16, suffix: "B"},
    "key-num"  : {type: "metric",   min: 50, max: 100, default: 70, step: 1,  suffix: "个"},
    "item-num" : {type: "metric",   min: 0,  max: 70,  default: 13, step: 1,  suffix: "个"},
    "item-len" : {type: "imperial", min: 0,  max: 60,  default: 25, step: 1,  suffix: "B"},
    "read-qps" : {type: "metric",   min: 20, max: 70,  default: 30, step: 1,  suffix: "/s"},
    "write-qps": {type: "metric",   min: 10, max: 60,  default: 20, step: 1,  suffix: "/s"},
  };

  valueConfigs = {
    "string" : {
      label      : "String",
      type       : "single-item",
      threshold  : {num: 0, len: 0},
      overhead   : {
        plain  : {value: 56, item: 0},
        zipped : {value: 56, item: 0}
      }
    },
    "hash" : {
      label      : "Hash",
      type       : "multi-item",
      threshold  : {num: 512, len: 64},
      overhead   : {
        plain  : {value: 56+64, item: 32+24},
        zipped : {value: 56+2,  item: 10}
      }
    },
    "list" : {
      label      : "List",
      type       : "multi-item",
      threshold  : {num: 512, len: 64},
      overhead   : {
        plain  : {value: 56+44, item: 24},
        zipped : {value: 56+11, item: 10}
      }
    },
    "set" : {
      label      : "Set",
      type       : "multi-item",
      threshold  : {num: 0, len: 0},
      overhead   : {
        plain  : {value: 56+64, item: 32},
        zipped : {value: 56+64, item: 0}
      }
    },
    "sorted-set" : {
      label      : "Sorted Set",
      type       : "multi-item",
      threshold  : {num: 128, len: 64},
      overhead   : {
        plain  : {value: 56+64+28, item: 32+24+36+16},
        zipped : {value: 56+11,    item: 10}
      }
    }
  };

  /**
   *  formula of resource calculation
   */
  Calculator = {
    single: function(keyLen, valueConfig, itemNum, itemLen) {
      if (itemNum <= valueConfig.threshold.num &&
          itemLen <= valueConfig.threshold.len) {
        overhead = valueConfig.overhead.zipped;
      } else {
        overhead = valueConfig.overhead.plain;
      }
      return {
        overhead: overhead,
        length:   keyLen + (itemLen + overhead.item) * itemNum + overhead.value
      }
    },
    space: function(keyLen, keyNum, valueConfig, itemNum, itemLen) {
      single = this.single(keyLen, valueConfig, itemNum, itemLen);
      return {
        single: single,
        total:  single.length * keyNum * 1.15
      }
    },
    server: function(keyLen, keyNum, valueConfig, itemNum, itemLen, readQps, writeQps) {
      // server by space
      space = this.space(keyLen, keyNum, valueConfig, itemNum, itemLen);
      bySpace = space.total / (40 * Math.pow(10, 9));
      // server by cpu
      allQps = readQps + writeQps;
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

  App = {
    getValueType: function() {
      $.each(valueConfigs, function(id, config) {
        if ($("#value-type-" + id).hasClass("active")) {
          currType = id;
        }
      });
      return {
        id: currType,
        label: valueConfigs[currType].label
      };
    }
  };

  Event = {};
  Event.dataInit =
  Event.dataChange = function(widget, id, value) {
    // get value-type
    getValueType = function() {
      return (widget == "value-type") ? id : App.getValueType().id;
    }
    valueConfig = valueConfigs[getValueType()];
    // get number of copy
    copy = 0;
    $.each(regions, function(id, item) {
      idcCopy = parseInt($("#region-spinner-" + id).val());
      if (idcCopy > 0) {
        copy += idcCopy;
      }
    });
    // get slider value
    getSlider = function(currId) {
      if (widget == "slider" && id == currId) {
        useValue = value;
      } else {
        useValue = $("#slider-" + currId).slider("value");
      }
      return formatize($("#slider-" + currId).attr("type"), "%d", useValue);
    }
    keyLen = getSlider("key-len");
    keyNum = getSlider("key-num");
    itemLen = getSlider("item-len");
    if (valueConfig.type == "single-item") {
      itemNum = 1;
    } else if (valueConfig.type == "multi-item") {
      itemNum = getSlider("item-num");
    }
    readQps = getSlider("read-qps");
    writeQps = getSlider("write-qps");

    space  = Calculator.space(keyLen, keyNum, valueConfig, itemNum, itemLen);
    server = Calculator.server(keyLen, keyNum, valueConfig, itemNum, itemLen, readQps, writeQps);
    fillResult = function(valueConfig, copy, space, server) {
      $("#result-key-len").html($("#slider-ui-key-len").html());
      $("#result-key-num").html($("#slider-ui-key-num").html());
      $("#result-item-len").html($("#slider-ui-item-len").html());
      $("#result-item-num").html($("#slider-ui-item-num").html());
      if (valueConfig.type == "single-item") {
        $("#result-value-single-item").show().html($("#slider-ui-item-len").html());
        $("#result-value-multi-item").hide();
      } else {
        $("#result-value-single-item").hide();
        $("#result-value-multi-item").show();
      }
      $("#result-item-overhead").html(space.single.overhead.item + "B");
      $("#result-value-overhead").html(space.single.overhead.value + "B");
      $("#result-space-copy-num").html(copy);
      $("#result-space")
        .attr("raw", space.total * copy)
        .html(formatize("imperial", "%s", space.total * copy) + "B");

      $("#result-by-space").html(server.bySpace.toFixed(2));
      $("#result-by-cpu").html(server.byCpu.toFixed(2));
      $("#result-by-net").html(server.byNet.toFixed(2));
      $("#result-server-copy-num").html(copy);
      $("#result-server")
        .attr("raw", server.actual * copy)
        .html(formatize("metric", "%s", server.actual * copy));
    }
    fillResult(valueConfig, copy, space, server);
  }
  Event.dataSummary = function() {
    rawSpace = rawServer = 0;
    $("div.shopping-good").each(function (){
      rawSpace  += parseFloat($(this).attr("raw-space"));
      rawServer += parseFloat($(this).attr("raw-server"));
    });
    $("#result-sum-space").html(formatize("imperial", "%s", rawSpace) + "B");
    $("#result-sum-server").html(formatize("metric", "%s", rawServer));
  }

  /**
   *  init widgets
   */
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

  $.each(regions, function(id, item) {
    $("#region-spinner-" + id)
      .attr("disabled", "disabled")
      .spinner().spinner("value", item.idcs);
    $("#region-spinner-" + id).siblings().click(function() {
      spinner = $(this).siblings("input");
      value = spinner.spinner("value");
      if (value <= 0) {
        spinner.spinner("value", 0);
      }
      Event.dataChange();
    });
  });

  $.each(valueConfigs, function(id, valueConfig) {
    $("#value-type-" + id).click(function() {
      if (valueConfig.type == "single-item") {
        $("#slider-item-num").parent().parent().hide();
        $("#label-item-len").html("Value 的长度");
      } else if (valueConfig.type == "multi-item") {
        $("#slider-item-num").parent().parent().show();
        $("#label-item-len").html("Item 的长度");
      }
      Event.dataChange("value-type", id);
    });
  });

  $("#button-add-to-cart").click(function (){
    space     = $("#result-space").html();
    rawSpace  = $("#result-space").attr("raw");
    server    = $("#result-server").html();
    rawServer = $("#result-server").attr("raw");
    deleteGood = function(button) {
      $(button).parent().remove();
      Event.dataSummary();
    }
    $("#container-cart").append(
      '<div class="badge shopping-good" raw-space="' + rawSpace + '" raw-server="' + rawServer + '">' +
        '<strong>' + App.getValueType().label + '</strong> [' + space + '][' + server + '台]' +
        '<span class="shopping-good-delete" onclick="javascript: deleteGood(this);">&times;</span>' +
      '</div>'
    );
    Event.dataSummary();
    return false;
  });

  Event.dataInit();

});
