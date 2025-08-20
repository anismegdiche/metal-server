//
//
//
import { AUDIO_TASK } from "../consts/AUDIO"


//
export type TStepRunAiAudioAudioClassificationParams = {
    task: AUDIO_TASK.AUDIO_CLASSIFICATION
    params: undefined
}

export type TStepRunAiAudioAutomaticSpeechRecognitionParams = {
    task: AUDIO_TASK.AUTOMATIC_SPEECH_RECOGNITION
    params: undefined
}

export type TStepRunAiAudioParams = TStepRunAiAudioAudioClassificationParams 
    | TStepRunAiAudioAutomaticSpeechRecognitionParams
