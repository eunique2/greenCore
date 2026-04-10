/**
 * @author : 노원상(artisthong@dongwha.com)
 * @date : 2025.04.10 13:51
 * @content
 *      웹앱용, 웹상에서 네이티브 메소드 호출 브릿지
 *      안드로이드 / iOS 공통 호출 규약
 *
 *      DWAPI.post(arr, callback)
 *
 *      환경 감지 우선순위:
 *        1) ReactNativeWebView → react-native-webview 환경
 *        2) UserAgent "DWWV"   → 기존 네이티브 웹뷰 환경
 *
 * @params
 *      arr : 배열형태로 파라미터를 넘깁니다.
 *        [(string)호출메소드, (ruled type)파라미터1, ...]
 *        ex1) DWAPI.post(["setPopToast","토스트메세지입니다."])
 *        ex2) DWAPI.post(["callSystemBrowser","https://daum.net"])
 *
 *      callback : 네이티브로부터 결과값을 리턴 받아 처리하는 콜백함수
 *        ex3) DWAPI.post(["getStorageData","test"],function(msg){alert(msg)})
 */
(function (window, undefined) {
  window.promises = {};

  var isReactNative = !!window.ReactNativeWebView;
  var isDWWV = navigator.userAgent.indexOf("DWWV") != -1;
  var isDWWViOS = navigator.userAgent.indexOf("DWWV iOS") != -1;

  if (isDWWViOS) {
    window.DWNAPI = webkit.messageHandlers.DWNAPI;
  }

  if (isReactNative || isDWWV) {
    var postMessageFunc = function (arr) {
      var promise = new Promise(function (resolve, reject) {
        var idx =
          Object.keys(window.promises).filter(function (a) {
            return a.indexOf(arr[0]) != -1;
          }).length + 1;
        arr.push(String(idx));
        promises[arr[0] + idx] = { resolve: resolve, reject: reject };

        if (isReactNative) {
          window.ReactNativeWebView.postMessage(JSON.stringify(arr));
        } else {
          try {
            window.DWNAPI.postMessage(arr);
          } catch (e) {
            console.log(e);
          }
        }
      });
      return promise;
    };

    window.DWAPI = {
      post: function (arr, _cb) {
        postMessageFunc(arr).then(
          function (res) {
            if (typeof _cb == "function") {
              try {
                _cb(JSON.parse(res));
              } catch (e) {
                _cb(res);
              }
            }
          },
          function (err) {
            if (typeof _cb == "function") {
              try {
                _cb(JSON.parse(err));
              } catch (e) {
                _cb(err);
              }
            }
          },
        );
      },
      postMessage: postMessageFunc,
      returnedMessage: function (name, data, err) {
        if (promises[name]) {
          if (err) {
            promises[name].reject(data);
          } else {
            promises[name].resolve(data);
          }
          delete promises[name];
        }
      },
    };

    /**
     * 푸시 터치이벤트시 호출
     * Native에서 푸시 터치 발생 시 onRecvNotification을 호출
     * 화면단에 onDWPushDeepLinkProc 함수를 선언하여 딥링크 처리
     */
    window.onRecvNotification = function (data) {
      var dataExt = "";
      if (data.EXT) {
        dataExt = data.EXT;
      } else if (data.payload && data.payload.EXT) {
        dataExt = data.payload.EXT;
      } else if (data.payload && data.payload.mps) {
        dataExt = data.payload.mps.ext;
      }
      if (dataExt) {
        var extArr = dataExt.split("|");
        if (typeof onDWPushDeepLinkProc == "function") {
          onDWPushDeepLinkProc(extArr);
        }
      }
    };

    console.log(
      "[DWAPI] 브릿지 초기화 완료 (" +
        (isReactNative ? "ReactNative" : "NativeWebView") +
        ")",
    );
  }
})(window);
