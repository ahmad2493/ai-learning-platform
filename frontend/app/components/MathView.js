import React, { useState, memo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * MathView - Renders LaTeX content using KaTeX in a WebView.
 * Optimized with robust height measurement and auto-detection.
 */
const MathView = ({ content, color = '#FFFFFF', fontSize = 16 }) => {
  const [height, setHeight] = useState(fontSize * 2);
  const webViewRef = useRef(null);

  // Convert Markdown bold **text** to HTML <b>text</b> before rendering
  const processedContent = content ? content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
      <style>
        * { box-sizing: border-box; -webkit-user-select: none; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: ${color};
          font-size: ${fontSize}px;
          margin: 0;
          padding: 0;
          background-color: transparent;
          overflow: hidden;
          word-wrap: break-word;
        }
        #math-wrapper {
          padding: 2px 4px;
          display: block;
          width: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }
        b { font-weight: bold; }
        .katex-display { margin: 0.4em 0; overflow-x: auto; overflow-y: hidden; }
      </style>
    </head>
    <body>
      <div id="math-wrapper">${processedContent}</div>
      <script>
        function sendHeight() {
          const wrapper = document.getElementById('math-wrapper');
          if (!wrapper) return;
          const height = wrapper.scrollHeight || wrapper.offsetHeight;
          window.ReactNativeWebView.postMessage(JSON.stringify({ height }));
        }

        document.addEventListener("DOMContentLoaded", function() {
          renderMathInElement(document.getElementById('math-wrapper'), {
            delimiters: [
              {left: "$$", right: "$$", display: true},
              {left: "$", right: "$", display: false},
              {left: "\\\\(", right: "\\\\)", display: false},
              {left: "\\\\[", right: "\\\\]", display: true}
            ],
            throwOnError: false
          });
          
          // Multiple checks to ensure correct height after fonts/math load
          setTimeout(sendHeight, 50);
          setTimeout(sendHeight, 250);
          setTimeout(sendHeight, 1000);
        });
        window.onload = sendHeight;
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{ height: Math.min(height, 800), width: '100%', overflow: 'hidden' }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        scrollEnabled={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.height > 0 && Math.abs(data.height - height) > 2) {
              setHeight(data.height + 4);
            }
          } catch (e) {}
        }}
        style={{ backgroundColor: 'transparent' }}
        containerStyle={{ backgroundColor: 'transparent' }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

export default memo(MathView);
