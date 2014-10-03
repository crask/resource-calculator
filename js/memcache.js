$(document).ready(function() {

  sliders = {
    "key-len"   : {type: "plain",    min: 0,  max: 255, default: 64, step: 16, suffix: "B"},
    "key-num"   : {type: "metric",   min: 50, max: 115, default: 80, step: 1,  suffix: "个"},
    "value-len" : {type: "imperial", min: 0,  max: 60,  default: 30, step: 1,  suffix: "B"},
    "read-qps"  : {type: "metric",   min: 20, max: 80,  default: 40, step: 1,  suffix: "/s"},
    "write-qps" : {type: "metric",   min: 10, max: 70,  default: 30, step: 1,  suffix: "/s"}
  };

  Calculator = function() {
    this.single = function(keyLen, valueLen) {
      return keyLen + valueLen;
    }
    this.space = function(keyLen, keyNum, valueLen) {
      return this.single(keyLen, valueLen) * keyNum;
    }
    this.server = function(keyLen, keyNum, valueLen, readQps, writeQps) {
      // server by memory
      bySpace = this.space(keyLen, keyNum, valueLen) / (40 * Math.pow(10, 9));
      // server by cpu
      allQps = readQps + writeQps;
      byCpu = allQps / (4 * Math.pow(10, 4));
      // server by throughput
      byNet = allQps * this.single(keyLen, valueLen) / (70 * Math.pow(10, 6));
      return {
        bySpace: bySpace,
        byCpu  : byCpu,
        byNet  : byNet,
        actual : Math.max(bySpace, byNet, byCpu)
      }
    }
  }

  fillResult = function(copy, space, server) {
    $("#result-key-len").html($("#slider-ui-key-len").html());
    $("#result-key-num").html($("#slider-ui-key-num").html());
    $("#result-value-len").html($("#slider-ui-value-len").html());
    $("#result-space-copy-num").html(copy);
    $("#result-space").html(formatize("imperial", "%s", space * copy) + "B");

    $("#result-by-space").html(server.bySpace.toFixed(2));
    $("#result-by-cpu").html(server.byCpu.toFixed(2));
    $("#result-by-net").html(server.byNet.toFixed(2));
    $("#result-server-copy-num").html(copy);
    $("#result-server").html(formatize("metric", "%s", server.actual * copy));
  }

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
    keyLen = formatizeWrapper("key-len", id, value);
    keyNum = formatizeWrapper("key-num", id, value);
    valueLen = formatizeWrapper("value-len", id, value);
    readQps  = formatizeWrapper("read-qps", id, value);
    writeQps = formatizeWrapper("write-qps", id, value);

    space = c.space(keyLen, keyNum, valueLen);
    server = c.server(keyLen, keyNum, valueLen, readQps, writeQps);
    fillResult(copy, space, server);
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
