const updateUserRole = async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      if (req.body.role === 'staff' && !user.reportsTo) {
        return res.status(400).json({ message: 'Staff must have a manager' });
      }
  
      user.role = req.body.role;
      await user.save();
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  const assignManager = async (req, res) => {
    try {
      const staff = await User.findById(req.params.id);
      const manager = await User.findById(req.body.managerId);
  
      if (!staff || !manager || manager.role !== 'manager') {
        return res.status(400).json({ message: 'Invalid assignment' });
      }
  
      staff.reportsTo = manager._id;
      await staff.save();
      res.json(staff);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  };