window.onload = function () {
  
      
      
      
      
      //<editor-fold desc="Changeable Configuration Block">
      window.ui = SwaggerUIBundle({
        "dom_id": "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        queryConfigEnabled: false,
        url: "http://localhost:8055/server/specs/oas?access_token=tGaMqvDZvpQLSovKOB2sR0pvV2v6j4I5",
        persistAuthorization: true,
      })
      
      //</editor-fold>






  window.ui.getConfigs().requestInterceptor = function(request) {
    if (!request.headers) request.headers = {};
    if (!request.headers["Authorization"]) {
      var specUrl = window.ui.getConfigs().url;
      try {
        var token = new URL(specUrl).searchParams.get("access_token");
        if (token) request.headers["Authorization"] = "Bearer " + token;
      } catch (e) {}
    }
    return request;
  };
};
