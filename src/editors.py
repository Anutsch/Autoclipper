"""Dispatch downloaded media to other editors outside the Premiere panel."""
import json
import os
import subprocess
import sys
import time
from functools import lru_cache
from pathlib import Path

from platform_tools import WINDOWS, open_folder, reveal_media
from clip_design import capcut_folder, overlay_paths

NAMES = {'premiere': 'Premiere Pro', 'resolve': 'DaVinci Resolve', 'capcut': 'CapCut'}


def running_editors():
    return _running_editors(int(time.monotonic() / 2))


@lru_cache(maxsize=2)
def _running_editors(_second):
    if WINDOWS:
        command = ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command',
                   "[Console]::OutputEncoding = [Text.Encoding]::UTF8; "
                   "Get-Process -Name 'Adobe Premiere Pro','Resolve','CapCut' "
                   "-ErrorAction SilentlyContinue | ForEach-Object { $_.Path }; exit 0"]
    else:
        command = ['/bin/ps', '-axo', 'comm=']
    try:
        result = subprocess.run(command, capture_output=True, encoding='utf-8', errors='replace',
                                check=True, timeout=5, **({'creationflags': subprocess.CREATE_NO_WINDOW} if WINDOWS else {}))
    except (OSError, subprocess.SubprocessError):
        return {}
    editors = {}
    for line in result.stdout.splitlines():
        executable = Path(line.strip())
        if WINDOWS:
            names = {'adobe premiere pro.exe': 'premiere', 'resolve.exe': 'resolve', 'capcut.exe': 'capcut'}
            editor = names.get(executable.name.lower())
            if editor and executable.is_absolute():
                editors[editor] = executable
            continue
        if executable.parent.name != 'MacOS' or executable.parent.parent.name != 'Contents':
            continue
        bundle = executable.parents[2]
        if executable.name.startswith('Adobe Premiere Pro') and bundle.suffix == '.app':
            editors['premiere'] = bundle
        elif executable.name == 'Resolve' and bundle.name == 'DaVinci Resolve.app':
            editors['resolve'] = bundle
        elif executable.name.lower() == 'capcut' and bundle.name.lower() == 'capcut.app':
            editors['capcut'] = bundle
    return editors


def destination():
    running = running_editors()
    # Keep Premiere as the default and prefer Resolve over the manual handoff.
    return next((editor for editor in NAMES if editor in running), 'premiere')


def handoff(editor, paths, job_id, root, design, camera=None):
    if not paths or not all(Path(path).is_file() for path in paths):
        raise ValueError('Mindestens eine heruntergeladene MP4 fehlt.')
    if camera:
        design = dict(design, assets=[camera, *design.get('assets', [])], cameraPath=camera)
    if editor == 'capcut':
        folder = capcut_folder(root, paths, design, job_id)
        if folder:
            open_folder(folder)
            return 'CapCut-Ordner geöffnet · Clips und Overlays in die Timeline ziehen.'
        return reveal_media(paths)
    app = running_editors().get('resolve')
    if not app:
        raise ValueError('DaVinci Resolve öffnen und den Import erneut starten.')
    if WINDOWS:
        api = Path(os.environ['PROGRAMDATA']) / 'Blackmagic Design/DaVinci Resolve/Support/Developer/Scripting'
        library = app.parent / 'fusionscript.dll'
    else:
        api = Path('/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting')
        library = app / 'Contents/Libraries/Fusion/fusionscript.so'
    env = dict(os.environ, RESOLVE_SCRIPT_API=str(api), RESOLVE_SCRIPT_LIB=str(library))
    try:
        result = subprocess.run([sys.executable, __file__, job_id], input=json.dumps({'paths': paths, 'design': design}),
                                env=dict(env, PYTHONIOENCODING='utf-8'), capture_output=True,
                                encoding='utf-8', timeout=45)
    except subprocess.TimeoutExpired:
        raise ValueError('Resolve antwortet nicht. Bitte Timeline und Skripting-Einstellungen prüfen.')
    if result.returncode:
        raise ValueError(result.stdout.strip() or 'Resolve-Skripting konnte nicht gestartet werden.')
    return 'Timeline in DaVinci Resolve erstellt · ' + result.stdout.strip()


def import_resolve(paths, job_id, design):
    sys.path.insert(0, str(Path(os.environ['RESOLVE_SCRIPT_API']) / 'Modules'))
    try:
        dll_directory = os.add_dll_directory(str(Path(os.environ['RESOLVE_SCRIPT_LIB']).parent)) if WINDOWS else None
        import DaVinciResolveScript
        resolve = DaVinciResolveScript.scriptapp('Resolve')
    except (ImportError, OSError):
        resolve = None
    if not resolve:
        raise ValueError('Resolve Studio öffnen und External scripting auf Local stellen.')
    manager = resolve.GetProjectManager()
    project = manager.GetCurrentProject()
    if not project:
        raise ValueError('In Resolve zuerst ein Projekt öffnen.')
    pool = project.GetMediaPool()
    name = 'Autoclipper ' + job_id[:12]
    path_key = lambda path: os.path.normcase(os.path.normpath(path))
    keys = [path_key(path) for path in paths]
    overlays = overlay_paths(design)
    # Reuse the same name when retrying an import whose result is uncertain.
    for index in range(1, project.GetTimelineCount() + 1):
        existing = project.GetTimelineByIndex(index)
        if existing and existing.GetName() == name:
            clips = existing.GetItemListInTrack('video', 1) or []
            imported = [path_key(clip.GetMediaPoolItem().GetClipProperty('File Path')) for clip in clips]
            overlay_tracks = [existing.GetItemListInTrack('video', track) or []
                              for track in range(2, 2 + len(overlays))]
            existing_overlays = [path_key(clip.GetMediaPoolItem().GetClipProperty('File Path'))
                                 for track in overlay_tracks for clip in track]
            if imported != keys or existing_overlays != [path_key(path) for path in overlays]:
                raise ValueError('Resolve enthält bereits eine unvollständige Timeline: ' + name)
            project.SetCurrentTimeline(existing)
            if not manager.SaveProject():
                raise ValueError('Resolve konnte das Projekt nicht speichern.')
            return name

    media = pool.ImportMedia(paths)
    if not media or len(media) != len(paths):
        raise ValueError('Resolve konnte nicht alle MP4s importieren.')
    by_path = {path_key(item.GetClipProperty('File Path')): item for item in media}
    if any(key not in by_path for key in keys):
        raise ValueError('Resolve konnte die importierten MP4s nicht zuordnen.')
    previous = project.GetCurrentTimeline()
    timeline = pool.CreateEmptyTimeline(name)
    if not timeline:
        raise ValueError('Resolve konnte die Timeline nicht erstellen.')
    try:
        timeline.SetSetting('useCustomSettings', '1')
        for key, value in [('timelineFrameRate', '30'), ('timelineResolutionWidth', '1080'),
                           ('timelineResolutionHeight', '1920')]:
            timeline.SetSetting(key, value)
            if float(timeline.GetSetting(key) or 0) != float(value):
                raise ValueError('Resolve konnte 1080 × 1920 bei 30 fps nicht einstellen.')
        if not project.SetCurrentTimeline(timeline):
            raise ValueError('Resolve konnte die neue Timeline nicht aktivieren.')
        placed = pool.AppendToTimeline([by_path[key] for key in keys])
        if not placed or len(placed) != len(paths):
            raise ValueError('Resolve konnte nicht alle Clips in die Timeline legen.')
        start = timeline.GetStartFrame()
        length = timeline.GetEndFrame() - start
        for index, path in enumerate(overlays, 2):
            if not Path(path).is_file():
                raise ValueError('Overlay file missing: ' + Path(path).name)
            items = pool.ImportMedia([path]) or []
            if len(items) != 1:
                raise ValueError('Resolve could not import the overlay.')
            if timeline.GetTrackCount('video') < index and not timeline.AddTrack('video'):
                raise ValueError('Resolve could not prepare the overlay track.')
            info = dict(mediaPoolItem=items[0], mediaType=1, trackIndex=index, recordFrame=start)
            if Path(path).suffix.lower() in ('.png', '.jpg', '.jpeg'):
                frames = min(length, round(float(design.get('duration', 5)) * 30)) if path == design.get('titlePath') else length
            else:
                try:
                    fps = float(items[0].GetClipProperty('FPS'))
                    source_frames = int(items[0].GetClipProperty('Frames'))
                    frames = min(source_frames, round(length * fps / 30))
                except (TypeError, ValueError):
                    raise ValueError('Resolve could not read the overlay duration.')
            info.update(startFrame=0, endFrame=max(0, frames - 1))
            overlay = pool.AppendToTimeline([info]) or []
            if not overlay:
                raise ValueError('Resolve could not place the overlay.')
            if path == design.get('cameraPath') and not overlay[0].SetProperty('Tilt', 590):
                raise ValueError('Resolve could not position the camera above the gameplay.')

    except Exception:
        if previous:
            project.SetCurrentTimeline(previous)
        pool.DeleteTimelines([timeline])
        raise
    if not manager.SaveProject():
        raise ValueError('Resolve konnte das Projekt nicht speichern.')
    return name


if __name__ == '__main__':
    try:
        payload = json.load(sys.stdin)
        print(import_resolve(payload['paths'], sys.argv[1], payload['design']))
    except Exception as error:
        print(error)
        sys.exit(1)
