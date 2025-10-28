using System;
using System.IO;

namespace MarkRead.Cli;

public enum StartupPathKind
{
	None,
	Directory,
	File,
	Unknown
}

public sealed class StartupArguments
{
	private StartupArguments(string? rawInput,
		string? fullPath,
		StartupPathKind kind)
	{
		RawInput = rawInput;
		FullPath = fullPath;
		PathKind = kind;
	}

	public static StartupArguments Empty { get; } = new(null, null, StartupPathKind.None);

	public string? RawInput { get; }

	public string? FullPath { get; }

	public StartupPathKind PathKind { get; }

	public bool HasArgument => PathKind != StartupPathKind.None;

	public string? RootCandidate => PathKind switch
	{
		StartupPathKind.Directory => FullPath,
		StartupPathKind.File => FullPath is null ? null : Path.GetDirectoryName(FullPath),
		StartupPathKind.Unknown => FullPath,
		_ => null
	};

	public string? DocumentCandidate => PathKind == StartupPathKind.File ? FullPath : null;

	public static StartupArguments Parse(string[]? args)
	{
		if (args == null || args.Length == 0)
		{
			return Empty;
		}

		var normalized = NormalizeInput(args[0]);
		if (string.IsNullOrWhiteSpace(normalized))
		{
			return Empty;
		}

		var expanded = ExpandToFullPath(normalized);
		var kind = DetermineKind(expanded);

		return new StartupArguments(normalized, expanded, kind);
	}

	private static string NormalizeInput(string input)
	{
		var trimmed = input.Trim();
		if (trimmed.Length >= 2 && trimmed[0] == '"' && trimmed[^1] == '"')
		{
			return trimmed[1..^1];
		}

		if (trimmed.Length >= 2 && trimmed[0] == '\'' && trimmed[^1] == '\'')
		{
			return trimmed[1..^1];
		}

		return trimmed;
	}

	private static string? ExpandToFullPath(string path)
	{
		var expanded = Environment.ExpandEnvironmentVariables(path);

		try
		{
			return Path.GetFullPath(expanded);
		}
		catch (Exception)
		{
			return expanded;
		}
	}

	private static StartupPathKind DetermineKind(string? path)
	{
		if (string.IsNullOrWhiteSpace(path))
		{
			return StartupPathKind.Unknown;
		}

		try
		{
			if (Directory.Exists(path))
			{
				return StartupPathKind.Directory;
			}

			if (File.Exists(path))
			{
				return StartupPathKind.File;
			}
		}
		catch (Exception)
		{
			return StartupPathKind.Unknown;
		}

		return StartupPathKind.Unknown;
	}
}
