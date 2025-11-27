Feature: Zoom and 
Goal: Allow users zoom and drag the view arround
Users: All users
Scenarios:

Currently it is already posible to zoom, using pinch actions on my touchpad or on my touch screen. I want to extend this with mouse and keyboard controls, following best practices.

I should be possible to zoom in and out:
using 
- CTRL - mouse scroll button
- keyboard CTRL + and CTRL - (also add to edit menu)

Reset zoom with CTRL 0
Add a reset zoom option to the edit menu

The zoom should be scoped per tab, so when changing tab, zoom should go back to that tabs zoom setting

In the settings there is a default zoom that should be used for new tabs; the default "default zoom" is 100%


It should be possible to move the document around with dragging the mouse. Possition should be stored when switching tabs, so when switching back it should look the same.