$(document).ready(function() {

  /**
   *  widgets profile data
   */
  regions = {
    "bj" : {idcs: 2, active: true},
    "nj" : {idcs: 1, active: false},
    "hz" : {idcs: 1, active: false}
  };

  sliders = {
    "key-len"   : {type: "plain",    min: 0,  max: 255, default: 64, step: 16, suffix: "B"},
    "key-num"   : {type: "metric",   min: 50, max: 115, default: 80, step: 1,  suffix: "个"},
    "value-len" : {type: "imperial", min: 0,  max: 60,  default: 30, step: 1,  suffix: "B"},
    "read-qps"  : {type: "metric",   min: 20, max: 80,  default: 40, step: 1,  suffix: "/s"},
    "write-qps" : {type: "metric",   min: 10, max: 70,  default: 30, step: 1,  suffix: "/s"},
    "redundancy": {type: "plain",    min: 0,  max: 100, default: 50, step: 10, suffix: "%"}
  };

  /**
   *  formula of resource calculation
   */
  Calculator = {
    single: function(keyLen, valueLen) {
      return keyLen + valueLen;
    },
    space: function(keyLen, keyNum, valueLen) {
      return this.single(keyLen, valueLen) * keyNum;
    },
    net: function(keyLen, valueLen) {
      return {
        cache: 0,
        proxy: Math.ceil(this.single(keyLen, valueLen) / 1500) * 162 + this.single(keyLen, valueLen)
      };
    },
    server: function(keyLen, keyNum, valueLen, readQps, writeQps) {
      allQps = readQps + writeQps;
      // proxy cpu/throughput
      proxyByCpu = allQps / (4 * Math.pow(10, 4));
      proxyByNet = allQps * this.net(keyLen, valueLen).proxy / (70 * Math.pow(10, 6));
      // cache cpu/throughput
      cacheBySpace = this.space(keyLen, keyNum, valueLen) / (40 * Math.pow(10, 9));
      cacheByNet   = allQps * this.single(keyLen, valueLen) / (70 * Math.pow(10, 6));
      return {
        proxy : {
          byCpu : proxyByCpu,
          byNet : proxyByNet,
        },
        cache : {
          bySpace: cacheBySpace,
          byNet  : cacheByNet,
        },
        actual : Math.max(proxyByCpu, proxyByNet) * multiplex + Math.max(cacheBySpace, cacheByNet * multiplex),
      }
    }
  }

  Event = {};
  Event.dataInit =
  Event.dataChange = function(widget, id, value) {
    copy = 0;
    getRegionCopy = function(currId, currItem) {
      if (widget == "region" && id == currId) {
        useValue = value;
      } else {
        if ($("#region-" + currId).hasClass("active")) {
          useValue = currItem.idcs;
        } else {
          useValue = 0;
        }
      }
      return useValue;
    }
    $.each(regions, function(id, item) {
      copy += getRegionCopy(id, item);
    });
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
    valueLen = getSlider("value-len");
    readQps  = getSlider("read-qps");
    writeQps = getSlider("write-qps");
    redundancy = getSlider("redundancy");
    multiplex = redundancy / 100 + 1;

    space  = Calculator.space(keyLen, keyNum, valueLen) * 1.1;
    server = Calculator.server(keyLen, keyNum, valueLen, readQps, writeQps, multiplex);
    fillResult = function(copy, space, server) {
      $("#result-key-len").html($("#slider-ui-key-len").html());
      $("#result-key-num").html($("#slider-ui-key-num").html());
      $("#result-value-len").html($("#slider-ui-value-len").html());
      $("#result-space-copy-num").html(copy);
      $("#result-space").html(formatize("imperial", "%s", space * copy) + "B");

      $("#result-kv-len-1").html(keyLen + valueLen);
      $("#result-kv-len-2").html(keyLen + valueLen);
      $("#result-net-per-req").html(Calculator.net(keyLen, valueLen).proxy.toFixed(0) + "B");

      $("#result-proxy-by-cpu").html(server.proxy.byCpu.toFixed(2));
      $("#result-proxy-by-net").html(server.proxy.byNet.toFixed(2));
      $("#result-proxy-redundancy").html((100 + redundancy) + '%');
      $("#result-cache-by-space").html(server.cache.bySpace.toFixed(2));
      $("#result-cache-by-net").html(server.cache.byNet.toFixed(2));
      $("#result-cache-redundancy").html((100 + redundancy) + '%');
      $("#result-server-copy-num").html(copy);
      $("#result-server").html(formatize("metric", "%s", server.actual * copy));
    }
    fillResult(copy, space, server);
  }

  /**
   *  init widgets
   */
  $.each(regions, function(id, item) {
    $("#region-" + id).click(function() {
      if ($(this).hasClass("active")) {
        Event.dataChange("region", id, 0);
      } else {
        Event.dataChange("region", id, item.idcs);
      }
    });
    if (item.active) {
      $("#region-" + id).addClass("active");
    }
  });

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

  Event.dataInit();

});
