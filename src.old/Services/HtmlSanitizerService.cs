using System;
using Ganss.Xss;

namespace MarkRead.App.Services;

public sealed class HtmlSanitizerService
{
    private readonly HtmlSanitizer _sanitizer;
    private readonly object _sync = new();

    public HtmlSanitizerService()
    {
        _sanitizer = CreateSanitizer();
    }

    public string Sanitize(string html, Uri? baseUri = null)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        lock (_sync)
        {
            return baseUri is null
                ? _sanitizer.Sanitize(html)
                : _sanitizer.Sanitize(html, baseUri.ToString());
        }
    }

    private static HtmlSanitizer CreateSanitizer()
    {
        var sanitizer = new HtmlSanitizer();

        sanitizer.AllowedTags.Add("pre");
        sanitizer.AllowedTags.Add("code");
        sanitizer.AllowedTags.Add("span");
        sanitizer.AllowedTags.Add("div");
        sanitizer.AllowedTags.Add("table");
        sanitizer.AllowedTags.Add("thead");
        sanitizer.AllowedTags.Add("tbody");
        sanitizer.AllowedTags.Add("tr");
        sanitizer.AllowedTags.Add("th");
        sanitizer.AllowedTags.Add("td");
        sanitizer.AllowedTags.Add("blockquote");
        sanitizer.AllowedTags.Add("figure");
        sanitizer.AllowedTags.Add("figcaption");
    sanitizer.AllowedTags.Add("dl");
    sanitizer.AllowedTags.Add("dt");
    sanitizer.AllowedTags.Add("dd");
        sanitizer.AllowedTags.Add("ul");
        sanitizer.AllowedTags.Add("ol");
        sanitizer.AllowedTags.Add("li");
        sanitizer.AllowedTags.Add("hr");
        sanitizer.AllowedTags.Add("input");
        sanitizer.AllowedTags.Add("img");
    sanitizer.AllowedTags.Add("sup");
    sanitizer.AllowedTags.Add("sub");
    sanitizer.AllowedTags.Add("kbd");

        sanitizer.AllowedAttributes.Add("class");
        sanitizer.AllowedAttributes.Add("id");
        sanitizer.AllowedAttributes.Add("href");
        sanitizer.AllowedAttributes.Add("src");
        sanitizer.AllowedAttributes.Add("alt");
        sanitizer.AllowedAttributes.Add("title");
        sanitizer.AllowedAttributes.Add("type");
        sanitizer.AllowedAttributes.Add("value");
        sanitizer.AllowedAttributes.Add("checked");
        sanitizer.AllowedAttributes.Add("disabled");
        sanitizer.AllowedAttributes.Add("target");
        sanitizer.AllowedAttributes.Add("rel");
        sanitizer.AllowedAttributes.Add("loading");
        sanitizer.AllowedAttributes.Add("width");
        sanitizer.AllowedAttributes.Add("height");
        sanitizer.AllowedAttributes.Add("colspan");
        sanitizer.AllowedAttributes.Add("rowspan");
        sanitizer.AllowedAttributes.Add("name");

        sanitizer.AllowedSchemes.Add("http");
        sanitizer.AllowedSchemes.Add("https");
        sanitizer.AllowedSchemes.Add("mailto");
        sanitizer.AllowedSchemes.Add("file");
        sanitizer.AllowedSchemes.Add("data");

        sanitizer.KeepChildNodes = true;

        return sanitizer;
    }
}
