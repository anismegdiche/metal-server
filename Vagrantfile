Vagrant.configure("2") do |config|
    # Force Hyper-V as the provider
    config.vm.provider "hyperv" do |h|
      h.memory = 4096  # 4GB RAM
      h.cpus = 2       # 2 CPU cores
    end
  
    # Ubuntu machine (Hyper-V compatible)
    config.vm.define "ubuntu" do |ubuntu|
      ubuntu.vm.box = "generic/ubuntu2004"
      ubuntu.vm.hostname = "ubuntu-test"
      ubuntu.vm.network "private_network", type: "dhcp"
      ubuntu.vm.provision "shell", inline: <<-SHELL
        sudo apt update -y
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt install -y nodejs
        cd /vagrant && npm install && npm run test
      SHELL
    end
  
    # CentOS machine (Hyper-V compatible)
    config.vm.define "centos" do |centos|
      centos.vm.box = "generic/centos7"
      centos.vm.hostname = "centos-test"
      centos.vm.network "private_network", type: "dhcp"
      centos.vm.provision "shell", inline: <<-SHELL
        sudo yum install -y epel-release
        curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
        sudo yum install -y nodejs
        cd /vagrant && npm install && npm run test
      SHELL
    end
  
    # Windows machine (Hyper-V compatible)
    config.vm.define "windows" do |win|
      win.vm.box = "gusztavvargadr/windows-10"
      win.vm.hostname = "windows-test"
      win.vm.communicator = "winrm"
      win.vm.network "private_network", type: "dhcp"
      win.vm.provision "shell", inline: <<-SHELL
        choco install -y nodejs
        cd /vagrant
        npm install
        npm run test
      SHELL
    end
  end
  