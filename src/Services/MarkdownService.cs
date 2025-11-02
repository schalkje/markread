using Markdig;
using Markdig.Syntax;
using Markdig.Extensions.CustomContainers;

namespace MarkRead.App.Services;

public sealed class MarkdownService
{
    private readonly MarkdownPipeline _pipeline;

    public MarkdownService()
    {
        var builder = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()
            .UsePipeTables()
            .UseTaskLists()
            .UseEmojiAndSmiley()
            .UseYamlFrontMatter()
            .UseGenericAttributes(); // Enables language attributes on code blocks

        builder.DocumentProcessed += document =>
        {
            // Remove empty paragraphs that Markdig sometimes leaves behind when trimming trailing newlines.
            for (int i = document.Count - 1; i >= 0; i--)
            {
                if (document[i] is ParagraphBlock paragraph && paragraph.Inline is null)
                {
                    document.RemoveAt(i);
                }
            }
        };

        _pipeline = builder.Build();
    }

    public string RenderToHtml(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return string.Empty;
        }

        return Markdown.ToHtml(markdown, _pipeline);
    }
}
