---
title: What's new
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
layout: home

hero:
  name: What's new in v0.5

features:
  - title: New Performance improvements
    details: |
      We have made some performance improvements to the system as well as plan and data providers.
      <br><br><span class="VPBadge danger">Learn more...</span>
    link: /documentation/config-yml

  - title: Plans Refactor
    details: |
      We have completely refactored the plans structure. Plans now contain direct step declarations with error management. This change makes plans more flexible and more powerful. You can now easily mix different operations in a single plan.
      <br><br><span class="VPBadge danger">Learn more...</span>
    link: /documentation/config-yml#plans

  - title: New Refactored AI Engines
    details: |
      We have refactored the AI engines to be more powerful and flexible. 
      No more AI engines configuration, everything is made automatically.
      All you have to do is to add the AI engine name in the run step. 
      <br><br><span class="VPBadge danger">Learn more...</span>
    link: /guides/ai-engines

  - title: Storage Data Provider
    details: |
      We have extended File Data Provider and added a new mode to handle directory data allowing to read and write files in a directory and process them.
      <br><br><span class="VPBadge danger">Learn more...</span>
    link: data-providers-config#storage

  - title: New Parquet file handler
    details: |
      We have added a new ability to handle Parquet files, allowing for efficient columnar data processing and schema evolution.
      <br><br><span class="VPBadge danger">Learn more...</span>
    link: data-providers-config#parquet
---
