plan > hot load after plan reload #fix {f} {start:2026-03-06T16:44:30} {cm:2026-03-06} {duration:01h27m} {h}
plan > activate disk for storage #feature
(A) plan > history of transformation with which step did the processing, also flag keep history {f}
step > set-var {f} {start:2026-03-03T19:07:03} {cm:2026-03-03} {duration:01h18m} {h}
content > text regex
plan > Data detection: use NLP/BrainJS for datatype detection based on RegExp string conversion
step > merge duplicates: merge on, take
step > for each
auth provider > Azure AD
plan > Data Transpose  (pivot H/V)
refactor: readstream #refactor
step > remove-empty-fields {f} {start:2026-04-23T09:55:42} {cm:2026-05-11} {duration:18d_05h11m} {h}
step > on-error {f} {start:2026-03-07T14:00:59} {cm:2026-04-21} {duration:1m-14d_14h44m} {h}
plan > use of 'source' in stead of 'schema'
step > clear data, context etc {f} {start:2026-04-26T19:56:52} {cm:2026-05-11} {duration:14d_19h10m} {h}
TODO:: check if fields from schemarequest can works with array, if true then update docs {f}
TODO:: sort add fields to be compatible with on-error {f}
schedule >  run-as   ,  to fix who is running the plan {f}
plan > test if user is not allowed to access schema, what is happening {f}
(A) source > split sql and azure {f} {cm:2026-08-10} {h}
guides, sample project : update
remove source from schemarequest if possible
(A) routing bad data to an error sink implicitly removes it from the plan data for downstream steps. The row exists in the error sink, but it's no longer in the main processing stream. {f} {start:2026-03-28T11:10:04} {cm:2026-05-11} {duration:1m-13d_17h11m} {h}
(A) step: fake data with faker js {f} {start:2026-08-18T21:06:14} {cm:2026-08-19} {duration:22h06m}
core > use threads (piscina)
(A) core > step metrics {f} {start:2026-05-12T10:04:10} {cm:2026-05-23} {duration:11d_07h05m} {h}
core > studio {f} {cm:2026-08-03} {h}
(A) step > break > add boolean condition to break {f} {start:2026-05-11T15:23:00} {cm:2026-05-11} {duration:01h17m} {h}
(A) make modules api registration dynamic {f} {start:2026-05-24T11:17:43} {cm:2026-05-24} {duration:01h49m} {h}
(A) move to monorepo {f} {start:2026-06-22T14:14:12} {cm:2026-07-30} {duration:1m-7d_11h43m} {h}
(A) refactor: remove normalize/stringify error, use new logger format {f} {start:2026-08-04T11:23:20} {cm:2026-08-04} {duration:03h52m} {h}
(A) move utils {start:2026-08-04T11:23:16} {f}
(A) source > pagination {f} {cm:2026-08-10} {h}
(A) endpoint > gzip compress {f} {start:2026-08-04T20:02:53} {cm:2026-08-07} {duration:2d_13h16m} {h}
(A) source > connections pools checking if a unique pool is open and not many {f} {cm:2026-08-04} {h}
(A) user > warmup : default admin, env , studio api key to connect {f} {start:2026-08-10T18:24:54}
users > crypt passwords {f}
(A) ai engines > multiple rows by request feature {f}
(A) dashboard > AI engines {f}
(A) finish studio: plans {f} {start:2026-08-18T08:55:50}
(A) limit offset in steps {f}