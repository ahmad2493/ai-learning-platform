import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: windowWidth } = Dimensions.get('window');

/**
 * MathView - Renders LaTeX content using KaTeX in a WebView
 * Supports mixed content or pure LaTeX.
 * Automatically converts Markdown bold (**) to HTML bold (<b>).
 */
export default function MathView({ content, color = '#FFFFFF', fontSize = 16 }) {
  const [height, setHeight] = useState(fontSize * 1.5);

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
        * {
          box-sizing: border-box;
        }
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
        #math-container {
          padding: 4px;
          line-height: 1.6;
          display: inline-block;
          width: 100%;
        }
        b {
          font-weight: bold;
        }
        .katex-display {
          margin: 0.5em 0;
          overflow-x: auto;
          overflow-y: hidden;
        }
      </style>
    </head>
    <body>
      <div id="math-container">${processedContent}</div>
      <script>
        function sendHeight() {
          const height = document.getElementById('math-container').offsetHeight;
          window.ReactNativeWebView.postMessage(height.toString());
        }

        document.addEventListener("DOMContentLoaded", function() {
          renderMathInElement(document.getElementById('math-container'), {
            delimiters: [
              {left: "$$", right: "$$", display: true},
              {left: "$", right: "$", display: false},
              {left: "\\\\(", right: "\\\\)", display: false},
              {left: "\\\\[", right: "\\\\]", display: true}
            ],
            throwOnError: false
          });
          
          sendHeight();
          window.addEventListener('load', sendHeight);
          setTimeout(sendHeight, 100);
          setTimeout(sendHeight, 500);
          setTimeout(sendHeight, 1000);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{ height: height, width: '100%', overflow: 'hidden' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        scrollEnabled={false}
        onMessage={(event) => {
          const webHeight = parseInt(event.nativeEvent.data, 10);
          if (webHeight > 0 && webHeight !== height) {
            setHeight(webHeight + 5);
          }
        }}
        style={{ backgroundColor: 'transparent', flex: 1 }}
        containerStyle={{ backgroundColor: 'transparent' }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}
