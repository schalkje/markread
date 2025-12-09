using Markdig;
using Markdig.Renderers;
using Markdig.Renderers.Html;
using Markdig.Renderers.Html.Inlines;
using Markdig.Syntax.Inlines;

namespace MarkRead.App.Services;

/// <summary>
/// Markdig extension that marks links starting with "/" as root-relative
/// by adding a data attribute. The leading slash is preserved in the href
/// but will be handled by JavaScript to prevent browser navigation.
/// </summary>
public sealed class RootRelativeLinkRewriter : IMarkdownExtension
{
    public void Setup(MarkdownPipelineBuilder pipeline)
    {
        // No setup needed for document processing
    }

    public void Setup(MarkdownPipeline pipeline, IMarkdownRenderer renderer)
    {
        if (renderer is HtmlRenderer htmlRenderer)
        {
            // Replace the default link renderer with our custom one
            var linkRenderer = htmlRenderer.ObjectRenderers.FindExact<LinkInlineRenderer>();
            if (linkRenderer != null)
            {
                htmlRenderer.ObjectRenderers.Remove(linkRenderer);
            }
            htmlRenderer.ObjectRenderers.AddIfNotAlready(new RootRelativeLinkInlineRenderer());
        }
    }

    private sealed class RootRelativeLinkInlineRenderer : HtmlObjectRenderer<LinkInline>
    {
        protected override void Write(HtmlRenderer renderer, LinkInline link)
        {
            var url = link.Url;
            var isRootRelative = !string.IsNullOrEmpty(url) && url.StartsWith("/") && !url.StartsWith("//");

            // Render the link (keeping the original URL)
            if (link.IsImage)
            {
                renderer.Write("<img src=\"");
                renderer.WriteEscapeUrl(url);
                renderer.Write("\"");
                
                if (isRootRelative)
                {
                    renderer.Write(" data-root-relative=\"true\"");
                }
                
                if (!string.IsNullOrEmpty(link.Title))
                {
                    renderer.Write(" title=\"");
                    renderer.WriteEscape(link.Title);
                    renderer.Write("\"");
                }
                
                renderer.Write(" alt=\"");
                renderer.WriteChildren(link);
                renderer.Write("\" />");
            }
            else
            {
                renderer.Write("<a href=\"");
                renderer.WriteEscapeUrl(url);
                renderer.Write("\"");
                
                if (isRootRelative)
                {
                    renderer.Write(" data-root-relative=\"true\"");
                }
                
                if (!string.IsNullOrEmpty(link.Title))
                {
                    renderer.Write(" title=\"");
                    renderer.WriteEscape(link.Title);
                    renderer.Write("\"");
                }
                
                renderer.Write(">");
                renderer.WriteChildren(link);
                renderer.Write("</a>");
            }
        }
    }
}
