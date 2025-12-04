this aims to be a simple build tool

right now it just fits neatly in vite, but maybe we should consider other host build envs for this same kind of tool.

rust once, json never

business domain types in rust => autogen elm types with codecs

this tool is a helper that aims to amplify the build through autogeneration
As a mere helper, it does not want to make many demands of devs.
There's an escape hatch for code, but all we need in rust is very basic data definition.

in return, you get cross platform client/server interop.
for certain classes of app, a similar approach works for store.
there's a few other benefits (like structured logging) that naturally fall into place.


* the sweet zone

well you could build with this,
but obviously it naturally suits a certain kind of application.
one which might be defined as; internal complexity, low surface area.
or: only a few holes, but very weirdly shaped.
sensible defaults make it bearable to stress the concept a bit further.
NOT a framework. NOT an ORM. you probably only want the client<==>server bit.

