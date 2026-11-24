"""Decode the exported file and validate both tracks, without OS package installs."""
import av

def check_media(path):
    with av.open(str(path)) as container:
        videos=list(container.streams.video)
        audios=list(container.streams.audio)
        assert videos and audios, 'Falta pista de vídeo o audio'
        info={'video':videos[0].codec_context.name,'audio':audios[0].codec_context.name,
              'width':videos[0].codec_context.width,'height':videos[0].codec_context.height}
    for kind in ('video','audio'):
        with av.open(str(path)) as container:
            count=0
            for frame in container.decode(**{kind:0}):
                count+=1
                if count>=10:
                    break
            assert count>=1, f'No se pudo decodificar {kind}'
    return info
