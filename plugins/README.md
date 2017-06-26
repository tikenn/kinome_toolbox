# Kinome Toolbox Plugins
This directory is for packages developed by the community, utilizing the SDK provided, rather than by the original developer. A small amount of information for each is provided. The structure of the descriptions are as follow:
- Description: a brief description of the core functionality provided by the plugin
- Plugin folder: the folder containing the plugin
- Plugin location: the file that must be loaded to add the plugin as a dependency to another plugin
- Entry location: the file that must be accessed by an application to display the plugin as an endpoint **not** a dependency
- Plugin dependencies: the list of plugin dependencies **outside** the SDK

## Quicklinks
- [Peptide Picker](#peptide-picker)
- [Image Picker](#image-picker)
- [Gradient](#gradient)
- [Level 1 Display](#level-1-display)
- [Heat Map](#heat-map)

# Peptide Picker
- Description: allows a sample, peptide, cycle, and exposure for a given data set to be chosen and passed to another function for use
- Plugin folder: ./peptide_picker
- Plugin location: ./peptide_picker
- Entry location: none
- Plugin dependencies: none

# Image Picker
- Description: unlike the peptide picker, only allows a sample, cycle, and exposure to be chosen (**peptide selection** not available) and passed to another function for use
- Plugin folder: ./img\_picker/img\_picker.js
- Plugin location: ./img\_picker/img\_picker.js
- Entry location: none
- Plugin dependencies: none

# Gradient
- Description: converts a number between [0, 1] into the HSL color space based on a pre-chosen gradient and, additionally, can provide a color bar representation of the gradient
- Plugin folder: ./gradient
- Plugin location: ./gradient/gradient.js
- Entry location: none
- Plugin dependencies: none

# Level 1 Display
- Description: graphically displays level 1 data using graphs of the following
    - cycle vs. signal
    - cycle vs. background
    - exposure vs. signal
    - exposure vs. background
- Plugin folder: ./level\_1\_display
- Plugin location: ./level\_1\_display/level\_1\_display.js
- Entry location: ./level\_1\_display/level\_1\_build.js
- Plugin dependencies:
    - [Peptide Picker](#peptide-picker)
    - [Gradient](#gradient)
    - [Google Charts](https://developers.google.com/chart/)

# Heat Map
- Description: graphically displays a heat map of the samples in level 2 data
- Plugin folder: ./heat_map
- Plugin location: ./heat\_map/heat\_map.js
- Entry location: ./heat\_map/heat\_map.js
- Plugin dependencies:
    - [Image Picker](#image-picker)
    - [Gradient](#gradient)
    - [HCluster](https://github.com/harthur/clusterfck)
